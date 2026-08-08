#!/usr/bin/env node
// Fixed-purpose screenshot/interaction tool — parameterized by CLI flags,
// not hand-written per invocation. Supports a small bounded set of
// pre-screenshot actions (click/fill/press/wait) executed in the order
// given, plus optionally stubbing crypto.randomUUID away to reproduce the
// insecure-context phone bug. Also reports console errors and any
// failed/4xx+/5xx network requests, since that's usually what a
// screenshot check is actually verifying.
import { chromium } from 'playwright';

function splitPair(raw) {
  const idx = raw.indexOf('::');
  if (idx === -1) throw new Error(`Expected "selector::value", got: ${raw}`);
  return [raw.slice(0, idx), raw.slice(idx + 2)];
}

function parseArgs(argv) {
  const args = { width: 1280, height: 900, fullPage: true, actions: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--url') args.url = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--width') args.width = Number(argv[++i]);
    else if (a === '--height') args.height = Number(argv[++i]);
    else if (a === '--wait-for') args.waitFor = argv[++i];
    else if (a === '--selector') {
      args.selector = argv[++i];
      args.fullPage = false;
    } else if (a === '--no-full-page') {
      args.fullPage = false;
    } else if (a === '--stub-no-random-uuid') {
      args.stubNoRandomUuid = true;
    } else if (a === '--touch') {
      args.touch = true;
    } else if (a === '--tap') {
      args.actions.push({ type: 'tap', selector: argv[++i] });
    } else if (a === '--touch-drag') {
      const [from, to] = splitPair(argv[++i]);
      args.actions.push({ type: 'touch-drag', from, to });
    } else if (a === '--click') {
      args.actions.push({ type: 'click', selector: argv[++i] });
    } else if (a === '--fill') {
      const [selector, value] = splitPair(argv[++i]);
      args.actions.push({ type: 'fill', selector, value });
    } else if (a === '--press') {
      const [selector, key] = splitPair(argv[++i]);
      args.actions.push({ type: 'press', selector, key });
    } else if (a === '--wait-after') {
      args.actions.push({ type: 'wait', selector: argv[++i] });
    } else if (a === '--resize') {
      const [w, h] = argv[++i].split('x').map(Number);
      args.actions.push({ type: 'resize', width: w, height: h });
    } else if (a === '--pause') {
      args.actions.push({ type: 'pause', ms: Number(argv[++i]) });
    } else if (a === '--dispatch-resize') {
      args.actions.push({ type: 'dispatch-resize' });
    } else if (a === '--scroll-to') {
      args.actions.push({ type: 'scroll-to', selector: argv[++i] });
    } else if (a === '--drag') {
      const [from, to] = splitPair(argv[++i]);
      args.actions.push({ type: 'drag', from, to });
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.url || !args.out) {
  console.error(
    [
      'Usage: node screenshot.mjs --url <url> --out <path.png> [options]',
      '',
      'Options:',
      '  --width N              viewport width (default 1280)',
      '  --height N             viewport height (default 900)',
      '  --wait-for <sel>       wait for a selector before doing anything else',
      '  --selector <sel>       screenshot only this element instead of the full page',
      '  --no-full-page         capture only the viewport, not the full scrollable page',
      '  --stub-no-random-uuid  delete window.crypto.randomUUID before page scripts run',
      '                         (reproduces the insecure-context/LAN-IP phone bug)',
      '  --touch                enable real touch input (hasTouch context) instead of',
      '                         mouse — required for --tap/--touch-drag to dispatch',
      '                         genuine touch events, not mouse events with a touch label',
      '',
      'Actions (repeatable, executed in the order given, before the screenshot):',
      '  --click <selector>     mouse click',
      '  --tap <selector>       touch tap (needs --touch)',
      "  --fill '<selector>::<value>'",
      "  --press '<selector>::<Key>'",
      '  --wait-after <selector>',
      "  --resize <W>x<H>       resize the viewport mid-test (e.g. simulating",
      '                         a mobile on-screen keyboard shrinking it)',
      "  --drag '<from>::<to>'        mouse drag between two selectors",
      "  --touch-drag '<from>::<to>'  real touch swipe between two selectors (needs",
      '                               --touch) — this is what actually exercises',
      '                               a browser-recognized scroll gesture, which can',
      '                               fire pointercancel instead of pointerup; a mouse',
      '                               drag never does, so --drag can\'t stand in for it',
    ].join('\n'),
  );
  process.exit(args.help ? 0 : 1);
}

const browser = await chromium.launch({ args: ['--no-sandbox'] });
const page = await browser.newPage({
  viewport: { width: args.width, height: args.height },
  hasTouch: args.touch ?? false,
  isMobile: args.touch ?? false,
});

// Real touch events (not mouse events with a touch label) via CDP —
// Playwright's own Touchscreen class only exposes a single tap(), no
// multi-point swipe/drag primitive.
const cdp = args.touch ? await page.context().newCDPSession(page) : null;
async function dispatchTouch(type, x, y) {
  await cdp.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
  });
}

if (args.stubNoRandomUuid) {
  await page.addInitScript(() => {
    // @ts-ignore — intentionally deleting a browser API to simulate an
    // insecure context, where crypto.randomUUID is undefined.
    delete window.crypto.randomUUID;
  });
}

const consoleErrors = [];
const consoleAll = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
  consoleAll.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => consoleErrors.push(String(err)));

const failedRequests = [];
page.on('requestfailed', (req) => failedRequests.push(req.url()));
page.on('response', (res) => {
  if (res.status() >= 400) failedRequests.push(`${res.status()} ${res.url()}`);
});

await page.goto(args.url, { waitUntil: 'networkidle' });
if (args.waitFor) {
  await page.waitForSelector(args.waitFor);
}

for (const action of args.actions) {
  if (action.type === 'click') await page.click(action.selector);
  else if (action.type === 'fill') await page.fill(action.selector, action.value);
  else if (action.type === 'press') await page.locator(action.selector).press(action.key);
  else if (action.type === 'wait') await page.waitForSelector(action.selector);
  else if (action.type === 'resize') await page.setViewportSize({ width: action.width, height: action.height });
  else if (action.type === 'pause') await page.waitForTimeout(action.ms);
  else if (action.type === 'dispatch-resize')
    await page.evaluate(() => {
      window.dispatchEvent(new Event('resize'));
      window.visualViewport?.dispatchEvent(new Event('resize'));
    });
  else if (action.type === 'scroll-to')
    await page.locator(action.selector).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  else if (action.type === 'drag') {
    // Real pointerdown -> gradual move -> pointerup, so it reads as a
    // drag/scroll gesture rather than a tap (which the "close on tap
    // outside" logic needs to tell apart — a single jump would land as
    // one pointerdown+pointerup pair too close together to count).
    const fromBox = await page.locator(action.from).boundingBox();
    const toBox = await page.locator(action.to).boundingBox();
    if (!fromBox || !toBox) throw new Error(`--drag: could not find bounding box for "${action.from}" or "${action.to}"`);
    await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await page.mouse.down();
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const x = fromBox.x + ((toBox.x - fromBox.x) * i) / steps;
      const y = fromBox.y + ((toBox.y - fromBox.y) * i) / steps;
      await page.mouse.move(x, y);
    }
    await page.mouse.up();
  } else if (action.type === 'tap') {
    if (!cdp) throw new Error('--tap requires --touch');
    const box = await page.locator(action.selector).boundingBox();
    if (!box) throw new Error(`--tap: could not find bounding box for "${action.selector}"`);
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await dispatchTouch('touchStart', x, y);
    await dispatchTouch('touchEnd', x, y);
  } else if (action.type === 'touch-drag') {
    if (!cdp) throw new Error('--touch-drag requires --touch');
    const fromBox = await page.locator(action.from).boundingBox();
    const toBox = await page.locator(action.to).boundingBox();
    if (!fromBox || !toBox)
      throw new Error(`--touch-drag: could not find bounding box for "${action.from}" or "${action.to}"`);
    const startX = fromBox.x + fromBox.width / 2;
    const startY = fromBox.y + fromBox.height / 2;
    const endX = toBox.x + toBox.width / 2;
    const endY = toBox.y + toBox.height / 2;
    await dispatchTouch('touchStart', startX, startY);
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      await dispatchTouch('touchMove', startX + ((endX - startX) * i) / steps, startY + ((endY - startY) * i) / steps);
    }
    await dispatchTouch('touchEnd', endX, endY);
  }
}

if (args.selector) {
  await page.locator(args.selector).screenshot({ path: args.out });
} else {
  await page.screenshot({ path: args.out, fullPage: args.fullPage });
}

console.log(JSON.stringify({ ok: true, out: args.out, consoleErrors, failedRequests, consoleAll }, null, 2));

await browser.close();
