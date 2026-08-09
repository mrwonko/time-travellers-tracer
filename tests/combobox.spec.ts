import { test, expect } from '@playwright/test';

// Most of MultiSelectCombobox's behavior (chamfer/position regression,
// open/filter/select, outside-click/Escape dismiss, multi-instance
// independence) is covered at the component level now — see
// src/lib/MultiSelectCombobox.browser.test.ts (Vitest browser mode, no
// full page needed). This one case stays here: whether a real mouse
// drag that crosses the popover suppresses the native light-dismiss
// depends on genuine OS-level pointer movement over real time, which
// Vitest browser mode's `userEvent` helper doesn't expose — it needs
// Playwright's raw `page.mouse` control against a real page.

test('a drag that crosses the popover does not dismiss it', async ({ page }) => {
  await page.goto('/#/components');
  await page.getByRole('heading', { name: 'MultiSelectCombobox' }).waitFor();
  await page.locator('button.combobox-trigger').click();

  const popover = page.locator('.combobox-popover-host');
  await expect(popover).toBeVisible();

  const box = await popover.boundingBox();
  if (!box) throw new Error('popover has no bounding box');
  // Drag starting on the popover and ending outside it — this is the
  // case confirmed safe in MultiSelectCombobox.svelte's FIXME comment
  // (a drag that never touches the popover at all is the still-open bug
  // documented there, deliberately not covered by a passing test).
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - 100, { steps: 8 });
  await page.mouse.up();

  await expect(popover).toBeVisible();
});
