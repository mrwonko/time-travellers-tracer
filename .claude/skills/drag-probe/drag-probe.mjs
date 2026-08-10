#!/usr/bin/env node
// Starts a real native-HTML5 drag (this app's DnD, via Pragmatic
// drag-and-drop, is built on element.draggable = true / DragEvents, not
// pointer events) and holds it hovering over one or more targets WITHOUT
// dispatching drop — so mid-drag UI (insertion-line indicators,
// potential/hovered CSS classes) can be inspected via screenshot or DOM
// dump. This is the thing tests/dragDrop.ts's nativeDragDrop() can't do:
// that helper always completes the gesture (drop + dragend) because
// Playwright specs only ever assert on drop *outcomes*. Debugging how a
// drag looks/behaves *while in flight* needs the drop step left out.
//
// Same event-dispatch technique as tests/dragDrop.ts (see that file's
// header comment for the full rationale): dispatch dragstart on the
// draggable box element (not the handle) with clientX/Y at the handle's
// position (the library's dragHandle-containment check resolves
// elementFromPoint() at those coordinates), bubbles: true (Pragmatic's
// element adapter listens on `document`, and synthetic events only
// bubble if told to).
//
// Kept deliberately narrow, same philosophy as screenshot.mjs — this
// isn't a general Playwright wrapper, just enough to start a drag, hover
// it somewhere, and look. Extend sparingly.
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { seedStory } from '../seed-story/seed-story.mjs';

function splitN(raw, n, usage) {
  const parts = raw.split('::');
  if (parts.length !== n) throw new Error(`${usage}, got: ${raw}`);
  return parts;
}

function parseArgs(argv) {
  const args = { width: 1280, height: 900, fullPage: true, clicks: [], hovers: [], dumpClasses: [], computedStyles: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') args.url = argv[++i];
    else if (a === '--seed') args.seed = argv[++i];
    else if (a === '--seed-file') args.seedFile = argv[++i];
    else if (a === '--wait-for') args.waitFor = argv[++i];
    else if (a === '--click') args.clicks.push(argv[++i]);
    else if (a === '--source') args.source = argv[++i];
    else if (a === '--handle') args.handle = argv[++i];
    else if (a === '--width') args.width = Number(argv[++i]);
    else if (a === '--height') args.height = Number(argv[++i]);
    else if (a === '--hover') {
      const raw = argv[++i];
      const idx = raw.indexOf('::');
      if (idx === -1) args.hovers.push({ selector: raw });
      else {
        const selector = raw.slice(0, idx);
        const [x, y] = raw
          .slice(idx + 2)
          .split(',')
          .map(Number);
        args.hovers.push({ selector, x, y });
      }
    } else if (a === '--end-drag') {
      args.endDrag = true;
    } else if (a === '--out') {
      args.out = argv[++i];
    } else if (a === '--selector') {
      args.selector = argv[++i];
      args.fullPage = false;
    } else if (a === '--no-full-page') {
      args.fullPage = false;
    } else if (a === '--dump-classes') {
      args.dumpClasses.push(argv[++i]);
    } else if (a === '--computed-style') {
      const raw = argv[++i];
      const parts = raw.split('::');
      if (parts.length === 2) args.computedStyles.push({ selector: parts[0], pseudo: null, props: parts[1].split(',') });
      else if (parts.length === 3) args.computedStyles.push({ selector: parts[0], pseudo: parts[1], props: parts[2].split(',') });
      else throw new Error(`--computed-style: expected "selector::props" or "selector::pseudo::props", got: ${raw}`);
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.url || !args.source) {
  console.error(
    [
      'Usage: node drag-probe.mjs --url <url> --source <selector> [options]',
      '',
      'Starts a native drag on --source and holds it (no drop dispatched)',
      'so you can inspect mid-drag indicator/hover state.',
      '',
      'Options:',
      '  --source <selector>    the draggable box element itself (what',
      "                         draggable() was registered on -- this app's",
      '                         [data-drag-box] element, e.g. .moment-drag-box)',
      '  --handle <selector>    the grab handle inside --source (defaults to',
      '                         --source itself if the whole element is its',
      '                         own handle) -- dragstart coordinates are',
      "                         taken from here, per this app's dragHandle",
      '                         containment check',
      '  --hover <selector>[::x,y]   (repeatable) dispatch dragenter+dragover',
      '                         on this target, in order given. x,y are pixel',
      "                         offsets from the target's top-left corner;",
      '                         omit for center. Each --hover updates the',
      "                         \"currently hovered\" state before the next.",
      '  --end-drag             dispatch a final dragend (at the last --hover',
      '                         point, or --source if there were none) --',
      "                         only needed if you'll start another drag",
      '                         later in the same script/page (only one',
      '                         native drag can be in flight at a time)',
      '  --seed <preset>        seed localStorage with a Story before',
      '                         navigating (see the seed-story skill) —',
      "                         e.g. 'demo' for the app's small K. Voss/",
      '                         Handler fixture, instead of the empty',
      '                         first-run story',
      '  --seed-file <path>     seed a custom { events, observers,',
      '                         timelines } JSON file instead of a preset',
      '  --width N / --height N viewport size (default 1280x900)',
      '  --wait-for <sel>       wait for a selector before starting the drag',
      '  --click <selector>     (repeatable) click before starting the drag,',
      '                         e.g. to expand a collapsed <details> panel',
      '',
      'Inspection (run after all --hover steps, before any --end-drag):',
      '  --out <path.png>       screenshot (needs --selector or captures the',
      '                         full page)',
      '  --selector <selector>  screenshot scope / only-this-element',
      '  --no-full-page         viewport only, not the full scrollable page',
      '  --dump-classes <selector>   (repeatable) print className for every',
      '                         matching element',
      "  --computed-style '<selector>::<props>'",
      "  --computed-style '<selector>::<pseudo>::<props>'",
      '                         (repeatable) dump getComputedStyle() values;',
      '                         props are comma-separated CSS property names',
      "                         (kebab-case, e.g. border-top-width); pseudo",
      "                         is 'before' or 'after' for ::before/::after",
    ].join('\n'),
  );
  process.exit(args.help ? 0 : 1);
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: args.width, height: args.height } });

if (args.seed) await seedStory(page, args.seed);
if (args.seedFile) await seedStory(page, JSON.parse(readFileSync(args.seedFile, 'utf8')));

await page.goto(args.url, { waitUntil: 'networkidle' });
if (args.waitFor) await page.waitForSelector(args.waitFor);
for (const selector of args.clicks) await page.click(selector);

const source = page.locator(args.source).first();
const handle = args.handle ? page.locator(args.handle).first() : source;
await handle.scrollIntoViewIfNeeded();
const handleBox = await handle.boundingBox();
if (!handleBox) throw new Error(`--handle: could not find bounding box for "${args.handle ?? args.source}"`);

const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
const opts = { dataTransfer, bubbles: true, cancelable: true };

await source.dispatchEvent('dragstart', {
  ...opts,
  clientX: handleBox.x + handleBox.width / 2,
  clientY: handleBox.y + handleBox.height / 2,
});

let last = { locator: source, point: { x: handleBox.x + handleBox.width / 2, y: handleBox.y + handleBox.height / 2 } };
for (const hover of args.hovers) {
  const target = page.locator(hover.selector).first();
  await target.scrollIntoViewIfNeeded();
  const box = await target.boundingBox();
  if (!box) throw new Error(`--hover: could not find bounding box for "${hover.selector}"`);
  const point = {
    x: box.x + (hover.x ?? box.width / 2),
    y: box.y + (hover.y ?? box.height / 2),
  };
  await target.dispatchEvent('dragenter', { ...opts, clientX: point.x, clientY: point.y });
  await target.dispatchEvent('dragover', { ...opts, clientX: point.x, clientY: point.y });
  last = { locator: target, point };
}

const result = { ok: true };

if (args.dumpClasses.length) {
  result.classes = {};
  for (const selector of args.dumpClasses) {
    result.classes[selector] = await page
      .locator(selector)
      .evaluateAll((els) => els.map((el) => el.className));
  }
}

if (args.computedStyles.length) {
  result.computedStyles = [];
  for (const { selector, pseudo, props } of args.computedStyles) {
    const value = await page.locator(selector).first().evaluate(
      (el, { pseudo, props }) => {
        const cs = getComputedStyle(el, pseudo ? `::${pseudo}` : undefined);
        const out = {};
        for (const p of props) out[p] = cs.getPropertyValue(p);
        return out;
      },
      { pseudo, props },
    );
    result.computedStyles.push({ selector, pseudo, value });
  }
}

if (args.out) {
  if (args.selector) {
    await page.locator(args.selector).screenshot({ path: args.out });
  } else {
    await page.screenshot({ path: args.out, fullPage: args.fullPage });
  }
  result.out = args.out;
}

if (args.endDrag) {
  await last.locator.dispatchEvent('dragend', { ...opts, clientX: last.point.x, clientY: last.point.y });
}

console.log(JSON.stringify(result, null, 2));

await browser.close();
