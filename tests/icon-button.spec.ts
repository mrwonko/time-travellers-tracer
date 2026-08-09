import { test, expect } from '@playwright/test';

// Most of IconButton's behavior (click fires, accessible name, disabled
// state) is covered at the component level now — see
// src/lib/IconButton.browser.test.ts (Vitest browser mode, no full page
// needed). This one case stays here: whether the browser's own native
// gesture recognition suppresses the `click` event for a press-drag-off
// -release-outside sequence depends on real OS-level input simulation,
// which Vitest browser mode's `userEvent` helper doesn't expose (only
// atomic actions like `.click()`) — it needs Playwright's raw
// `page.mouse` control against a real page.

test('press, drag off the button, and release outside does not fire the action', async ({ page }) => {
  await page.goto('/#/editor');
  await page.getByRole('heading', { name: 'Events' }).waitFor();

  const rows = page.locator('.data-table').nth(0).locator('tbody tr');
  const countBefore = await rows.count();

  await page.getByPlaceholder('New event label…').fill('Drag-off event');
  const addButton = page.getByLabel('Add event');
  const box = await addButton.boundingBox();
  if (!box) throw new Error('button has no bounding box');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - 200, { steps: 8 });
  await page.mouse.up();

  await expect(rows).toHaveCount(countBefore);
});
