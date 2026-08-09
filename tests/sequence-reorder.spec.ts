import { test, expect } from '@playwright/test';
import { nativeDragDrop } from './dragDrop';
import { gotoEditorWithDemoStory } from './seedDemoStory';

// Dragging a whole sequence onto a sibling reorders among the observer's
// own sequences — presentation-order only (no spec meaning between an
// observer's sequences), so no undo toast, unlike moment-reorder.spec.ts's
// equivalent. Uses nativeDragDrop (see dragDrop.ts) since the source and
// target sequence blocks can be far enough apart on screen (a whole
// sequence's worth of moments in between) that Playwright's own
// dragTo()/mouse-simulated native drag silently fails to trigger —
// confirmed by bisection.
//
// Each sequence has two single-purpose drop regions rather than one
// region split into "before"/"after" halves: the header always means
// "insert before this sequence", and a dedicated .sequence-drop-after
// strip (rendered after "add moment") always means "insert after this
// sequence" — kept spatially separate from the moments list in between
// so they can never overlap MomentBox's own merge-splice drop targets.

test.describe('sequence reorder', () => {
  test('dropping on a sibling sequence header inserts before it, without an undo toast', async ({ page }) => {
    await gotoEditorWithDemoStory(page);
    await page.getByRole('heading', { name: 'Observers' }).waitFor();

    // .sequence-block elements from *every* observer are always present in
    // the DOM (<details> keeps collapsed content mounted, just hidden), and
    // ObserverList's own outer panel is itself a <details> containing every
    // observer's name too — so scope precisely to K. Voss's own <details>
    // (its nearest ancestor from its <summary>), not just any container
    // whose text happens to include "K. Voss".
    const summary = page.locator('summary').filter({ hasText: 'K. Voss' });
    await summary.click();
    const panel = summary.locator('xpath=ancestor::details[1]');
    const sequences = panel.locator('.sequence-block');
    await expect(sequences).toHaveCount(2);
    await expect(sequences.nth(0)).toContainText('3 moments');
    await expect(sequences.nth(1)).toContainText('1 moment');

    // Drag Sequence 2 onto Sequence 1's header -> Sequence 2 lands right
    // before Sequence 1, i.e. array order becomes
    // [originally-Sequence-2, originally-Sequence-1].
    const source = sequences.nth(1).locator('.sequence-header');
    const handle = source.getByLabel(/Drag "Sequence 2"/);
    const target = sequences.nth(0).locator('.sequence-header');
    const targetBox = (await target.boundingBox())!;

    await nativeDragDrop(source, handle, target, { x: targetBox.width / 2, y: targetBox.height / 2 });

    await expect(sequences.nth(0)).toContainText('1 moment');
    await expect(sequences.nth(1)).toContainText('3 moments');

    await expect(page.locator('.toast-host .undo-toast')).toHaveCount(0);
  });

  test('dropping on a sibling sequence\'s trailing region inserts after it, without an undo toast', async ({
    page,
  }) => {
    await gotoEditorWithDemoStory(page);
    await page.getByRole('heading', { name: 'Observers' }).waitFor();

    const summary = page.locator('summary').filter({ hasText: 'K. Voss' });
    await summary.click();
    const panel = summary.locator('xpath=ancestor::details[1]');
    const sequences = panel.locator('.sequence-block');
    await expect(sequences).toHaveCount(2);
    await expect(sequences.nth(0)).toContainText('3 moments');
    await expect(sequences.nth(1)).toContainText('1 moment');

    // Drag Sequence 1 onto Sequence 2's trailing region -> Sequence 1
    // lands right after Sequence 2, i.e. array order becomes
    // [originally-Sequence-2, originally-Sequence-1] — same end state as
    // the header test above, reached via the opposite region+direction.
    const source = sequences.nth(0).locator('.sequence-header');
    const handle = source.getByLabel(/Drag "Sequence 1"/);
    const target = sequences.nth(1).locator('.sequence-drop-after');

    await nativeDragDrop(source, handle, target, { x: 10, y: 0 });

    await expect(sequences.nth(0)).toContainText('1 moment');
    await expect(sequences.nth(1)).toContainText('3 moments');

    await expect(page.locator('.toast-host .undo-toast')).toHaveCount(0);
  });
});
