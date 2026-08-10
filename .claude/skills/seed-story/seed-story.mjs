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
// otherwise need. Keep this in sync by hand if that fixture's shape ever
// changes.

const STORAGE_KEY = 'time-travellers-tracer:story';

const e1 = 'seed-e1',
  e2 = 'seed-e2',
  e3 = 'seed-e3',
  primeId = 'seed-u1';

export const PRESETS = {
  // Mirrors src/lib/demoStory.ts / tests/seedDemoStory.ts: K. Voss lives a
  // 3-event stretch forward, the Handler lives the same stretch inverted,
  // they meet at the handoff — plus a second unmerged sequence and a
  // multi-event moment, to exercise merge-splice and multi-event display.
  demo: {
    universes: [{ id: primeId, label: 'Prime' }],
    events: [
      { id: e1, label: 'Signal received at the depot', predecessors: [], universe: primeId },
      { id: e2, label: 'Handoff at the overpass', predecessors: [e1], universe: primeId },
      { id: e3, label: 'Depot burns', predecessors: [e2], universe: primeId },
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

// storyOrPreset: a preset name (see PRESETS above), or a raw
// { events, observers, universes } object — no schemaVersion wrapper
// needed, this adds it.
export async function seedStory(page, storyOrPreset) {
  const story = typeof storyOrPreset === 'string' ? PRESETS[storyOrPreset] : storyOrPreset;
  if (!story) {
    throw new Error(`seedStory: unknown preset "${storyOrPreset}" (known presets: ${Object.keys(PRESETS).join(', ')})`);
  }
  const raw = JSON.stringify({ schemaVersion: 1, story }, null, 2);
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, raw],
  );
}
