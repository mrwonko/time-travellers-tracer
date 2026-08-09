import { test, expect } from '@playwright/test';
import { nativeDragDrop } from './dragDrop';
import { gotoEditorWithDemoStory } from './seedDemoStory';

// Dragging a story event from the Events table onto a sequence (rather
// than an existing moment) implicitly creates a new one-event moment at a
// position determined by the drop target — each .moment-gap div (rendered
// before the first moment, between each pair, and after the last one) is
// itself a real drop target, not just a visual insertion-line indicator,
// so the position you drop on is exactly the position the new moment
// lands at. Both are real data additions (moment order is
// spec-meaningful), so both get an undo toast, unlike the purely-cosmetic
// sequence-reorder equivalent.

test.describe('event dropped on a sequence creates a new moment', () => {
  test('dropping in the gap between two moments inserts a new moment there, with an undo toast', async ({ page }) => {
    await gotoEditorWithDemoStory(page);
    await page.getByRole('heading', { name: 'Observers' }).waitFor();

    const summary = page.locator('summary').filter({ hasText: 'K. Voss' });
    await summary.click();
    const panel = summary.locator('xpath=ancestor::details[1]');
    const sequence = panel.locator('.sequence-block').first();
    await sequence.waitFor();

    const moments = sequence.locator('.moment-drag-box');
    await expect(moments).toHaveCount(3);
    await expect(moments.nth(0)).toContainText('Signal received at the depot');
    await expect(moments.nth(1)).toContainText('Handoff at the overpass');

    const source = page.locator('tr[data-drag-box]').filter({ hasText: 'Depot burns' });
    const handle = source.getByLabel('Drag "Depot burns" onto a moment or sequence');
    // Gaps: [0] before moment 0, [1] between moment 0 and 1, [2] between
    // moment 1 and 2, [3] after moment 2 — dropping on [1] should land the
    // new moment between the two original ones.
    const target = sequence.locator('.moment-gap').nth(1);
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

  test('dropping in the gap after the last moment appends a new moment, with an undo toast', async ({ page }) => {
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
    const target = sequence.locator('.moment-gap').last();
    const targetBox = (await target.boundingBox())!;

    await nativeDragDrop(source, handle, target, { x: targetBox.width / 2, y: targetBox.height / 2 });

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
