import { test, expect } from '@playwright/test';
import { nativeDragDrop } from './dragDrop';
import { gotoEditorWithDemoStory } from './seedDemoStory';

// Dragging a story event from the Events table onto an existing moment's
// body adds it to that moment's event set — real data addition (not a
// cosmetic reorder), so unlike event-chip reordering this gets an undo
// toast. Duplicates are allowed (spec: an observer can witness the same
// event twice), so dropping an event already elsewhere in the story is
// still a valid, meaningful add.

test('dragging an event onto a moment adds it, with an undo toast', async ({ page }) => {
  await gotoEditorWithDemoStory(page);
  await page.getByRole('heading', { name: 'Observers' }).waitFor();

  const summary = page.locator('summary').filter({ hasText: 'K. Voss' });
  await summary.click();
  const panel = summary.locator('xpath=ancestor::details[1]');
  const sequence = panel.locator('.sequence-block').first();
  await sequence.waitFor();

  const firstMoment = sequence.locator('.moment-drag-box').first();
  await expect(firstMoment).toContainText('Signal received at the depot');
  await expect(firstMoment.locator('.event-chip')).toHaveCount(1);

  const source = page.locator('tr[data-drag-box]').filter({ hasText: 'Depot burns' });
  const handle = source.getByLabel('Drag "Depot burns" onto a moment or sequence');
  const target = firstMoment.locator('.moment-body');
  const targetBox = (await target.boundingBox())!;

  await nativeDragDrop(source, handle, target, { x: targetBox.width / 2, y: targetBox.height / 2 });

  await expect(firstMoment.locator('.event-chip')).toHaveCount(2);
  await expect(firstMoment).toContainText('Signal received at the depot');
  await expect(firstMoment).toContainText('Depot burns');

  const toast = page.locator('.toast-host .undo-toast');
  await expect(toast).toContainText('Added event to moment');
  await toast.getByText('UNDO').click();

  await expect(firstMoment.locator('.event-chip')).toHaveCount(1);
  await expect(firstMoment).toContainText('Signal received at the depot');
});
