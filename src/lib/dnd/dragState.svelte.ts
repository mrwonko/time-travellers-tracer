import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { autoScrollWindowForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import type { DragBoxData } from './actions';

// Module-level runes store, same pattern as toastQueue.svelte.ts — one
// drag can be in flight for the whole app at a time, and any drop target
// anywhere in the tree may want to know what's currently being dragged
// (e.g. to CSS-class itself as a valid/invalid target) without being
// wired up as a direct prop/context relationship to the drag source.
let dragging = $state<DragBoxData | null>(null);

export function getDragging(): DragBoxData | null {
  return dragging;
}

let initialized = false;

// Wires the app-wide drag monitor (for `getDragging()`) and window
// auto-scroll exactly once. Idempotent so App.svelte can call it
// unconditionally on every mount without double-registering.
export function initDragMonitor(): void {
  if (initialized) return;
  initialized = true;

  monitorForElements({
    onDragStart: ({ source }) => {
      dragging = source.data as unknown as DragBoxData;
    },
    onDrop: () => {
      dragging = null;
    },
  });

  autoScrollWindowForElements();
}
