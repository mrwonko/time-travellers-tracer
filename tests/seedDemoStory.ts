import type { Page } from '@playwright/test';
import { demoStory } from '../src/lib/demoStory';
import { STORAGE_KEY, serializeStory } from '../src/lib/persistence';

// Since story.svelte.ts, first-run now starts empty rather than seeded with
// demoStory() (spec §11 Phase 1 — that seed is kept around specifically for
// reuse like this, see demoStory.ts's own comment). Specs that still want
// the old K. Voss/Handler fixture on screen — most of the drag-and-drop
// specs, which assert on its specific shape rather than building it through
// the UI — seed localStorage with it via page.addInitScript (runs before
// any page script, so story.svelte.ts's own load-on-import picks it up as
// if it had been saved in an earlier session) instead of relying on it being
// there by default.
export async function gotoEditorWithDemoStory(page: Page): Promise<void> {
  const raw = serializeStory(demoStory());
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [STORAGE_KEY, raw] as [string, string],
  );
  await page.goto('/#/editor');
}
