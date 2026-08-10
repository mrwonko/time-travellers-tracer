---
name: seed-story
description: Reusable Playwright building block that seeds a Story (events/observers/moments) into localStorage before navigation, for scripts that need existing data to interact with instead of the app's empty first-run state. Not run directly — used via drag-probe/screenshot's --seed flag, or imported into a one-off script.
---

# Seed story

Not a standalone command — a small importable module other Playwright
tooling composes with. The app starts genuinely empty on first run (no
seed data), and building up events/observers/moments through the UI by
hand before every drag/screenshot check is slow and easy to get subtly
wrong (typo'd labels, wrong predecessor, etc).

```js
import { seedStory } from '../seed-story/seed-story.mjs';

const page = await browser.newPage();
await seedStory(page, 'demo');           // or a raw { events, observers, timelines } object
await page.goto('http://localhost:8080/#/editor');
```

Must be called **before** `page.goto()` — it works via
`page.addInitScript()`, which only affects navigations registered after
it runs.

## Using it from drag-probe / screenshot

Both already wire this up as CLI flags, so you usually don't need to
import the module directly:

```
node .claude/skills/drag-probe/drag-probe.mjs --url ... --seed demo --source ...
node .claude/skills/screenshot/screenshot.mjs --url ... --seed demo --out ...
```

`--seed-file <path.json>` loads a custom `{ events, observers,
timelines }` file instead of a named preset — e.g. for a bespoke
stress-test story (many events, to check layout at scale) that isn't
worth baking in as a permanent preset. Write the JSON with a throwaway
script or by hand, point `--seed-file` at it, delete it when done.

Reach for `seedStory()` directly only when writing a genuinely new
one-off script neither tool covers.

## Presets

- `demo` — the same small fixture as `src/lib/demoStory.ts` /
  `tests/seedDemoStory.ts` (3 events, 2 observers — one with a second,
  mergeable sequence and an inverted multi-event moment). Duplicated by
  hand here rather than imported from that `.ts` file, since these
  scripts run under plain `node` without a TypeScript loader — update
  `PRESETS.demo` in `seed-story.mjs` if the real fixture's shape ever
  changes.
