import { test, expect } from '@playwright/test';

// Drag-and-drop reorder of moments within a sequence — the first real
// end-to-end drag behavior, using the same real-page Playwright approach
// as icon-button.spec.ts/combobox.spec.ts (Vitest browser mode's
// userEvent can't produce genuine multi-step pointer/native-DnD gestures).
// Relies on the app's own seed data (K. Voss's Sequence 1, three moments
// in event order: Signal received at the depot / Handoff at the overpass
// / Depot burns) the same way smoke.spec.ts already does for the Events
// table, rather than building fixture state through the UI.

test('dragging a moment past a sibling reorders it, with an undo toast', async ({ page }) => {
  await page.goto('/#/editor');
  await page.getByRole('heading', { name: 'Observers' }).waitFor();

  await page.getByText('K. Voss', { exact: false }).first().click();
  const sequence = page.locator('.sequence-block').first();
  await sequence.waitFor();

  const moments = sequence.locator('.moment-drag-box');
  await expect(moments).toHaveCount(3);
  await expect(moments.nth(0)).toContainText('Signal received at the depot');
  await expect(moments.nth(1)).toContainText('Handoff at the overpass');
  await expect(moments.nth(2)).toContainText('Depot burns');

  const handle = moments.nth(0).getByLabel('Drag to reorder moment');
  const targetBox = await moments.nth(1).boundingBox();
  if (!targetBox) throw new Error('moment box has no bounding box');

  // Drop in the bottom half of the second moment box, so the closest
  // edge resolves to 'bottom' — moment #1 should land just after #2.
  await handle.dragTo(moments.nth(1), {
    targetPosition: { x: targetBox.width / 2, y: targetBox.height * 0.85 },
  });

  await expect(moments.nth(0)).toContainText('Handoff at the overpass');
  await expect(moments.nth(1)).toContainText('Signal received at the depot');
  await expect(moments.nth(2)).toContainText('Depot burns');

  const toast = page.locator('.toast-host .undo-toast');
  await expect(toast).toContainText('Reordered moments');
  await toast.getByText('UNDO').click();

  await expect(moments.nth(0)).toContainText('Signal received at the depot');
  await expect(moments.nth(1)).toContainText('Handoff at the overpass');
  await expect(moments.nth(2)).toContainText('Depot burns');
});
