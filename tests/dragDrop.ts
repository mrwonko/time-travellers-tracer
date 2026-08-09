import type { Locator } from '@playwright/test';

// Pragmatic drag-and-drop (used throughout this app's DnD) is built on
// native HTML5 drag events (element.draggable = true), not pointer
// events. Playwright's own locator.dragTo()/mouse simulation *can*
// trigger a real native drag, but only reliably over short on-screen
// distances — confirmed by bisection: an identical drag mechanism
// (adjacent moment boxes, ~100px apart) works via dragTo(), but the same
// mechanism between elements ~300px+ apart silently does nothing (no
// canDrop/onDrop ever fires). This isn't specific to this app's code —
// it's a general limitation of physically-simulated native HTML5 drag
// over CDP.
//
// Manually dispatching the drag event sequence sidesteps the distance
// limitation entirely, since it doesn't rely on continuous physical
// pointer movement at all. Two things matter for it to work correctly
// with Pragmatic DnD specifically:
// - Events must have `bubbles: true` — Pragmatic DnD's element adapter
//   listens on `document`, and a synthetic DragEvent only bubbles if you
//   say so explicitly (unlike a real trusted browser-generated drag
//   event, which always bubbles regardless).
// - `dragstart` must be dispatched on the actual `data-drag-box` element
//   (what `draggable()` was registered with — the ancestor box, not the
//   grip handle button inside it), but with `clientX`/`clientY` set to
//   the *handle's* position, not the box's — the library's own
//   dragHandle-containment check resolves `document.elementFromPoint()`
//   at those coordinates and requires it to land inside the handle,
//   independent of which element dispatchEvent() was called on. That
//   also means the handle must actually be scrolled into the viewport
//   when dragstart fires — elementFromPoint() returns null for a point
//   outside it — so this scrolls the handle into view and re-measures
//   immediately before dispatching dragstart.
export async function nativeDragDrop(
  source: Locator,
  handle: Locator,
  target: Locator,
  targetPoint: { x: number; y: number },
): Promise<void> {
  const page = source.page();
  await handle.scrollIntoViewIfNeeded();
  const handleBox = await handle.boundingBox();
  const targetBox = await target.boundingBox();
  if (!handleBox || !targetBox) throw new Error('nativeDragDrop: source handle or target has no bounding box');

  const start = { clientX: handleBox.x + handleBox.width / 2, clientY: handleBox.y + handleBox.height / 2 };
  const end = { clientX: targetBox.x + targetPoint.x, clientY: targetBox.y + targetPoint.y };

  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  const opts = { dataTransfer, bubbles: true, cancelable: true };
  await source.dispatchEvent('dragstart', { ...opts, ...start });
  await target.dispatchEvent('dragenter', { ...opts, ...end });
  await target.dispatchEvent('dragover', { ...opts, ...end });
  await target.dispatchEvent('drop', { ...opts, ...end });

  // A drop can remove `source` from the DOM entirely (e.g. a sequence
  // merge-splice deletes the now-empty source sequence) — a removed node
  // can't meaningfully receive/bubble a further event, and Playwright's
  // locator.dispatchEvent() would otherwise hang waiting for a selector
  // that will never reappear. dragend is best-effort cleanup (resets the
  // library's internal "is a drag active" flag for the *next* drag on
  // this page) — skip it if the source is already gone.
  if ((await source.count()) > 0) {
    await source.dispatchEvent('dragend', { ...opts, ...end });
  }
}
