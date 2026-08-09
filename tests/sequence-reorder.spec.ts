import { test, expect } from '@playwright/test';
import { nativeDragDrop } from './dragDrop';

// Dragging a whole sequence onto a sibling sequence's header reorders
// among the observer's own sequences — presentation-order only (no spec
// meaning between an observer's sequences), so no undo toast, unlike
// moment-reorder.spec.ts's equivalent. Uses nativeDragDrop (see
// dragDrop.ts) since the source and target sequence blocks can be far
// enough apart on screen (a whole sequence's worth of moments in
// between) that Playwright's own dragTo()/mouse-simulated native drag
// silently fails to trigger — confirmed by bisection.

test('dragging a sequence onto a sibling sequence reorders them, without an undo toast', async ({ page }) => {
  await page.goto('/#/editor');
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
  await expect(sequences.nth(0)).toContainText('Sequence 1');
  await expect(sequences.nth(1)).toContainText('Sequence 2');
  await expect(sequences.nth(0)).toContainText('3 moments');
  await expect(sequences.nth(1)).toContainText('1 moment');

  const source = sequences.nth(0).locator('.sequence-header');
  const handle = source.getByLabel(/Drag "Sequence 1"/);
  const target = sequences.nth(1).locator('.sequence-header');
  const targetBox = (await target.boundingBox())!;

  // Drop on the bottom half of Sequence 2's header -> the 3-moment
  // fragment lands right after the 1-moment one, i.e. array order becomes
  // [originally-Sequence-2, originally-Sequence-1]. Labels are purely
  // positional ("Sequence N" = array index, spec: no meaning between
  // sequences), so they now point at whatever landed in that slot —
  // moment counts are the stable way to tell the fragments apart here.
  await nativeDragDrop(source, handle, target, { x: targetBox.width / 2, y: targetBox.height * 0.85 });

  await expect(sequences.nth(0)).toContainText('1 moment');
  await expect(sequences.nth(1)).toContainText('3 moments');

  await expect(page.locator('.toast-host .undo-toast')).toHaveCount(0);
});
