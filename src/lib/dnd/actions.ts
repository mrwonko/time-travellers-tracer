// Keyboard accessibility for drag-and-drop is deliberately deferred (see
// time-travel-viz-spec.md §8). Future direction: a focused drag-target
// becomes keyboard-activatable, giving a keyboard "cursor" that can move
// up/down within its own nesting level and left to jump to the parent
// level. Not designed or built yet — the actions in this file are
// pointer/touch-only.

import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { attachClosestEdge, extractClosestEdge } from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import type { Edge } from '../reorder';

export interface DragBoxData {
  // 'event' is a chip already inside a specific moment (containerId = that
  // moment's id, for reordering within it) — distinct from 'storyEvent', a
  // raw StoryEvent dragged out of the Events table (no containerId), which
  // can be dropped onto a moment (add it there) or a sequence (create a
  // new moment containing it, at a position determined by the drop
  // target).
  level: 'sequence' | 'moment' | 'event' | 'storyEvent';
  id: string;
  // The sequence id a moment payload belongs to, or the moment id an
  // event payload belongs to — not meaningful for a 'sequence' or
  // 'storyEvent' payload.
  containerId?: string;
}

function toRecord(data: DragBoxData): Record<string, unknown> {
  return { ...data };
}

function toDragBoxData(data: Record<string | symbol, unknown>): DragBoxData {
  return data as unknown as DragBoxData;
}

// Registers `node` as the grab handle for the nearest ancestor box marked
// `data-drag-box` (each of MomentSequenceBlock/MomentBox/EventChip's own
// root element) — kept as a DOM-ancestor lookup rather than wiring the box
// element through as a second parameter, so call sites only ever need to
// pass the data for the thing being dragged.
export function dragHandle(node: HTMLElement, getData: () => DragBoxData) {
  const boxElement = node.closest<HTMLElement>('[data-drag-box]');
  if (!boxElement) {
    throw new Error('dragHandle must be nested inside an element with a data-drag-box attribute');
  }

  const cleanup = draggable({
    element: boxElement,
    dragHandle: node,
    getInitialData: () => toRecord(getData()),
  });

  return {
    destroy: cleanup,
  };
}

export interface DropBoxParams {
  data: () => DragBoxData;
  canDrop: (source: DragBoxData) => boolean;
  onDrop: (source: DragBoxData, edge: Edge) => void;
  // Fires while a valid drag hovers this box, with the edge (top/bottom)
  // it's currently closest to — and with `null` once it leaves or drops —
  // so callers can render a live insertion-indicator line. Optional: a
  // drop target that doesn't render its own indicator (e.g. a container-
  // level empty-list fallback) can omit it.
  onHoverChange?: (edge: Edge | null) => void;
}

function edgeOf(data: Record<string | symbol, unknown>): Edge {
  return extractClosestEdge(data) === 'top' ? 'top' : 'bottom';
}

// Registers `node` as a drop target that also tracks which edge (top/
// bottom) of itself the drag is closest to, so callers can splice/reorder
// relative to that edge rather than always appending.
export function dropBox(node: HTMLElement, params: DropBoxParams) {
  let current = params;

  const cleanup = dropTargetForElements({
    element: node,
    getData: ({ input, element }) =>
      attachClosestEdge(toRecord(current.data()), { element, input, allowedEdges: ['top', 'bottom'] }),
    canDrop: ({ source }) => current.canDrop(toDragBoxData(source.data)),
    onDragEnter: ({ self }) => current.onHoverChange?.(edgeOf(self.data)),
    onDrag: ({ self }) => current.onHoverChange?.(edgeOf(self.data)),
    onDragLeave: () => current.onHoverChange?.(null),
    onDrop: ({ source, self }) => {
      current.onHoverChange?.(null);
      current.onDrop(toDragBoxData(source.data), edgeOf(self.data));
    },
  });

  return {
    update(next: DropBoxParams) {
      current = next;
    },
    destroy: cleanup,
  };
}
