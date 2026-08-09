import { test, expect } from '@playwright/test';
import { nativeDragDrop } from './dragDrop';
import { gotoEditorWithDemoStory } from './seedDemoStory';

// Drag-and-drop reorder of events within a moment — the third and final
// nesting level. Unlike moment/sequence reorder, event order has no spec
// meaning (Moment.events is a set), so no undo toast is expected here.
// Builds a 2-event moment through the UI first (the seed data's existing
// moments each reference only one event), then drags the chips.

test('dragging an event chip past a sibling reorders them, with no undo toast', async ({ page }) => {
  await gotoEditorWithDemoStory(page);
  await page.getByRole('heading', { name: 'Observers' }).waitFor();

  const summary = page.locator('summary').filter({ hasText: 'K. Voss' });
  await summary.click();
  const panel = summary.locator('xpath=ancestor::details[1]');
  const sequence = panel.locator('.sequence-block').first();
  await sequence.waitFor();

  // The add-moment row's combobox starts with nothing selected — check two
  // events so the new moment has both.
  await sequence.locator('.add-moment button.combobox-trigger').click();
  const popover = sequence.locator('.add-moment .combobox-popover-host');
  await popover.getByLabel('Signal received at the depot').check();
  await popover.getByLabel('Handoff at the overpass').check();
  await page.keyboard.press('Escape');
  await sequence.locator('.add-moment button[aria-label="Add moment"]').click();

  const newMoment = sequence.locator('.moment-drag-box').last();
  const chips = newMoment.locator('.event-drag-box');
  await expect(chips).toHaveCount(2);
  await expect(chips.nth(0)).toContainText('Signal received at the depot');
  await expect(chips.nth(1)).toContainText('Handoff at the overpass');

  const source = chips.nth(1);
  const handle = source.getByLabel('Drag to reorder event');
  const target = chips.nth(0);
  const targetBox = (await target.boundingBox())!;

  // Drop on the left half of the first chip -> the dragged chip lands
  // before it.
  await nativeDragDrop(source, handle, target, { x: targetBox.width * 0.15, y: targetBox.height / 2 });

  await expect(chips.nth(0)).toContainText('Handoff at the overpass');
  await expect(chips.nth(1)).toContainText('Signal received at the depot');

  await expect(page.locator('.toast-host .undo-toast')).toHaveCount(0);
});
