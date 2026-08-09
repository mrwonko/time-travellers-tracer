import { test, expect } from '@playwright/test';
import { nativeDragDrop } from './dragDrop';

// The original ask this whole drag-and-drop pass was built for: dragging
// one sequence and dropping it *between* moments of another sequence
// splices its moments in at that position (not just appended at the end,
// like the old "Merge into…" dropdown+button did), and the now-empty
// source sequence is removed. Uses nativeDragDrop (see dragDrop.ts) —
// source and target sequences can be far enough apart on screen that
// Playwright's dragTo()/mouse-simulated native drag silently fails.

test('dragging a sequence onto a moment in another sequence splices at that position, with an undo toast', async ({
  page,
}) => {
  await page.goto('/#/editor');
  await page.getByRole('heading', { name: 'Observers' }).waitFor();

  const summary = page.locator('summary').filter({ hasText: 'K. Voss' });
  await summary.click();
  const panel = summary.locator('xpath=ancestor::details[1]');
  const sequences = panel.locator('.sequence-block');
  await expect(sequences).toHaveCount(2);

  const sourceSequence = sequences.nth(1); // Sequence 2: 1 moment ("Depot burns")
  const targetSequence = sequences.nth(0); // Sequence 1: 3 moments
  await expect(sourceSequence).toContainText('1 moment');
  await expect(targetSequence).toContainText('3 moments');

  const targetMoments = targetSequence.locator('.moment-drag-box');
  await expect(targetMoments).toHaveCount(3);
  await expect(targetMoments.nth(0)).toContainText('Signal received at the depot');
  await expect(targetMoments.nth(1)).toContainText('Handoff at the overpass');
  await expect(targetMoments.nth(2)).toContainText('Depot burns');

  const source = sourceSequence.locator('.sequence-header');
  const handle = source.getByLabel(/Drag "Sequence 2"/);
  // Drop on the *first* moment of the target sequence, top half, so the
  // closest edge resolves to 'top' — the source's moment should be
  // spliced in *before* it, not appended at the end (the whole point of
  // replacing the old append-only "Merge into…").
  const target = targetMoments.nth(0);
  const targetBox = (await target.boundingBox())!;

  await nativeDragDrop(source, handle, target, { x: targetBox.width / 2, y: targetBox.height * 0.15 });

  // Sequence 2 is gone (merged away); Sequence 1 (now index 0) has the
  // spliced-in moment first, followed by its original three.
  await expect(sequences).toHaveCount(1);
  const merged = sequences.nth(0).locator('.moment-drag-box');
  await expect(merged).toHaveCount(4);
  await expect(merged.nth(0)).toContainText('Depot burns');
  await expect(merged.nth(1)).toContainText('Signal received at the depot');
  await expect(merged.nth(2)).toContainText('Handoff at the overpass');
  await expect(merged.nth(3)).toContainText('Depot burns');

  const toast = page.locator('.toast-host .undo-toast');
  await expect(toast).toContainText('Merged sequences');
  await toast.getByText('UNDO').click();

  await expect(sequences).toHaveCount(2);
  await expect(sequences.nth(0)).toContainText('3 moments');
  await expect(sequences.nth(1)).toContainText('1 moment');
});
