import { test, expect } from '@playwright/test';
import { nativeDragDrop } from './dragDrop';
import { gotoEditorWithDemoStory } from './seedDemoStory';

// Dragging a story event onto the "Add sequence" button skips the usual
// empty-sequence intermediate state: it creates a brand-new sequence that
// already contains a moment for the dragged event, in one step. Real data
// addition, so it gets an undo toast like the other insert-a-moment
// behaviors.

test('dragging an event onto Add Sequence creates a new sequence with a moment for it, with an undo toast', async ({
  page,
}) => {
  await gotoEditorWithDemoStory(page);
  await page.getByRole('heading', { name: 'Observers' }).waitFor();

  const summary = page.locator('summary').filter({ hasText: 'K. Voss' });
  await summary.click();
  const panel = summary.locator('xpath=ancestor::details[1]');
  const sequences = panel.locator('.sequence-block');
  await expect(sequences).toHaveCount(2);

  const source = page.locator('tr[data-drag-box]').filter({ hasText: 'Depot burns' });
  const handle = source.getByLabel('Drag "Depot burns" onto a moment or sequence');
  const target = panel.locator('.add-sequence-drop');
  const targetBox = (await target.boundingBox())!;

  await nativeDragDrop(source, handle, target, { x: targetBox.width / 2, y: targetBox.height / 2 });

  await expect(sequences).toHaveCount(3);
  const newSequence = sequences.last();
  await expect(newSequence).toContainText('1 moment');
  await expect(newSequence.locator('.moment-drag-box')).toHaveCount(1);
  await expect(newSequence).toContainText('Depot burns');

  const toast = page.locator('.toast-host .undo-toast');
  await expect(toast).toContainText('Added sequence');
  await toast.getByText('UNDO').click();

  await expect(sequences).toHaveCount(2);
});
