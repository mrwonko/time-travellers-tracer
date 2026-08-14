// @ts-check
// Reusable Playwright building block: seeds a Story into localStorage via
// page.addInitScript(), so a script that needs existing events/observers/
// moments to interact with doesn't have to drive the whole UI by hand
// first, or hand-roll this same seeding boilerplate itself. Not a
// standalone CLI — import seedStory()/PRESETS into a script that already
// owns a Playwright `page` (drag-probe.mjs and screenshot.mjs both expose
// this as a --seed/--seed-file flag; see their SKILL.mds).
//
// Must be called *before* page.goto() — addInitScript only affects
// navigations registered after it runs.
//
// PRESETS.demo is a hand-duplicated plain-JS literal, not imported from
// src/lib/demoStory.ts: these scripts run under plain `node`, which can't
// resolve TypeScript's extensionless imports (demoStory.ts itself imports
// './id' with no extension) without a loader this project doesn't
// otherwise need. The `// @ts-check` above plus the `Story` type import
// below (a type-only import, so it costs nothing at runtime — `tsc` can
// resolve it even though plain `node` couldn't) is the safety net for
// that hand-duplication instead: `make check` fails if this fixture's
// shape ever drifts from the real one in src/lib/types.ts, even though
// the two aren't the same object at runtime.

/** @typedef {import('../../../src/lib/types.ts').Story} Story */

const STORAGE_KEY = 'time-travellers-tracer:story';

const e1 = 'seed-e1',
  e2 = 'seed-e2',
  e3 = 'seed-e3',
  primeId = 'seed-u1';

/** @type {Record<string, Story>} */
export const PRESETS = {
  // Mirrors src/lib/demoStory.ts / tests/seedDemoStory.ts: K. Voss lives a
  // 3-event stretch forward, the Handler lives the same stretch inverted,
  // they meet at the handoff — plus a second unmerged sequence and a
  // multi-event moment, to exercise merge-splice and multi-event display.
  demo: {
    timelines: [{ id: primeId, label: 'Prime' }],
    events: [
      { id: e1, label: 'Signal received at the depot', predecessors: [], timeline: primeId },
      { id: e2, label: 'Handoff at the overpass', predecessors: [e1], timeline: primeId },
      { id: e3, label: 'Depot burns', predecessors: [e2], timeline: primeId },
    ],
    observers: [
      {
        id: 'seed-o1',
        name: 'K. Voss',
        sequences: [
          {
            id: 'seed-s1',
            moments: [
              { id: 'seed-m1', events: [e1], direction: 'forward' },
              { id: 'seed-m2', events: [e2], direction: 'forward' },
              { id: 'seed-m3', events: [e3], direction: 'forward' },
            ],
          },
          { id: 'seed-s2', moments: [{ id: 'seed-m4', events: [e3], direction: 'forward' }] },
        ],
      },
      {
        id: 'seed-o2',
        name: 'The Handler',
        sequences: [
          {
            id: 'seed-s3',
            moments: [
              { id: 'seed-m5', events: [e3], direction: 'inverted' },
              { id: 'seed-m6', events: [e2, e1], direction: 'inverted' },
            ],
          },
        ],
      },
    ],
  },
};

/**
 * @param {import('playwright').Page} page
 * @param {string | Story} storyOrPreset a preset name (see PRESETS above),
 *   or a raw Story object — no schemaVersion wrapper needed, this adds it.
 */
export async function seedStory(page, storyOrPreset) {
  const story = typeof storyOrPreset === 'string' ? PRESETS[storyOrPreset] : storyOrPreset;
  if (!story) {
    throw new Error(`seedStory: unknown preset "${storyOrPreset}" (known presets: ${Object.keys(PRESETS).join(', ')})`);
  }
  // 2 must track persistence.ts's CURRENT_SCHEMA_VERSION — hand-duplicated
  // rather than imported, same reason as STORAGE_KEY above.
  const raw = JSON.stringify({ schemaVersion: 2, story }, null, 2);
  await page.addInitScript(
    // This callback is stringified and injected into the *browser* page
    // by addInitScript, not run in this file's own Node context — window
    // is real there even though tsconfig.node.json's Node-only lib
    // doesn't know that.
    // @ts-expect-error window is a browser global, not a Node one
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, raw],
  );
}
