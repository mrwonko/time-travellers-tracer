import { test, expect } from '@playwright/test';
import { nativeDragDrop } from './dragDrop';
import { gotoEditorWithDemoStory } from './seedDemoStory';

// Dragging a story event from the Events table onto a sequence (rather
// than an existing moment) implicitly creates a new one-event moment at a
// position determined by the drop target — a moment's own header means
// "insert right before this moment", and the trailing .sequence-drop-after
// strip means "insert at the end" (there's no natural "footer" per moment
// to reuse for that position the way there is a header). Both are real
// data additions (moment order is spec-meaningful), so both get an undo
// toast, unlike the purely-cosmetic sequence-reorder equivalent.

test.describe('event dropped on a sequence creates a new moment', () => {
  test('dropping on a moment header inserts a new moment right before it, with an undo toast', async ({ page }) => {
    await gotoEditorWithDemoStory(page);
    await page.getByRole('heading', { name: 'Observers' }).waitFor();

    const summary = page.locator('summary').filter({ hasText: 'K. Voss' });
    await summary.click();
    const panel = summary.locator('xpath=ancestor::details[1]');
    const sequence = panel.locator('.sequence-block').first();
    await sequence.waitFor();

    const moments = sequence.locator('.moment-drag-box');
    await expect(moments).toHaveCount(3);
    await expect(moments.nth(1)).toContainText('Handoff at the overpass');

    const source = page.locator('tr[data-drag-box]').filter({ hasText: 'Depot burns' });
    const handle = source.getByLabel('Drag "Depot burns" onto a moment or sequence');
    const target = moments.nth(1).locator('.moment-header');
    const targetBox = (await target.boundingBox())!;

    await nativeDragDrop(source, handle, target, { x: targetBox.width / 2, y: targetBox.height / 2 });

    await expect(moments).toHaveCount(4);
    await expect(moments.nth(0)).toContainText('Signal received at the depot');
    await expect(moments.nth(1).locator('.event-chip')).toHaveCount(1);
    await expect(moments.nth(1)).toContainText('Depot burns');
    await expect(moments.nth(2)).toContainText('Handoff at the overpass');
    await expect(moments.nth(3)).toContainText('Depot burns');

    const toast = page.locator('.toast-host .undo-toast');
    await expect(toast).toContainText('Added moment');
    await toast.getByText('UNDO').click();

    await expect(moments).toHaveCount(3);
    await expect(moments.nth(1)).toContainText('Handoff at the overpass');
  });

  test('dropping on the trailing strip inserts a new moment at the end, with an undo toast', async ({ page }) => {
    await gotoEditorWithDemoStory(page);
    await page.getByRole('heading', { name: 'Observers' }).waitFor();

    const summary = page.locator('summary').filter({ hasText: 'K. Voss' });
    await summary.click();
    const panel = summary.locator('xpath=ancestor::details[1]');
    const sequence = panel.locator('.sequence-block').first();
    await sequence.waitFor();

    const moments = sequence.locator('.moment-drag-box');
    await expect(moments).toHaveCount(3);

    // Not a `.filter({ hasText })` on the row here — "Signal received at
    // the depot" also appears inside the *next* row's Predecessors cell,
    // so that would match two rows. The drag handle's aria-label is exact
    // per event, so locate it first and walk up to its own row instead.
    const handle = page.getByLabel('Drag "Signal received at the depot" onto a moment or sequence');
    const source = handle.locator('xpath=ancestor::tr[1]');
    const target = sequence.locator('.sequence-drop-after');

    await nativeDragDrop(source, handle, target, { x: 10, y: 0 });

    await expect(moments).toHaveCount(4);
    await expect(moments.nth(2)).toContainText('Depot burns');
    await expect(moments.nth(3).locator('.event-chip')).toHaveCount(1);
    await expect(moments.nth(3)).toContainText('Signal received at the depot');

    const toast = page.locator('.toast-host .undo-toast');
    await expect(toast).toContainText('Added moment');
    await toast.getByText('UNDO').click();

    await expect(moments).toHaveCount(3);
  });
});
