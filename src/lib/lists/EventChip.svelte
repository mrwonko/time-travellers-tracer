<script lang="ts">
  // A single event within a moment, rendered as its own small box rather
  // than folded into a joined-label string — same box-based building
  // block as MomentSequenceBlock/MomentBox, one level deeper, down to
  // the same drag-and-drop mechanism. Read-only: event *membership* is
  // still edited via MultiSelectCombobox in MomentBox's edit mode; this
  // only displays and reorders the result. Unlike moment/sequence order,
  // event order within a moment has no spec meaning (Moment.events is a
  // set) — reordering here is purely visual consistency with the other
  // two levels, which is also why it gets no undo toast (see
  // ObserverCard.svelte's reorderEvents).
  //
  // Like MomentBox, this chip is its own drag source and drop target
  // (unchanged, still the real hit-region), but doesn't render its own
  // insertion-line indicator — that's a single shared element per gap,
  // owned by MomentBox, driven by both neighbors' hover state. See
  // DropIndicatorLine.svelte and MomentBox's isEventGapHovered.
  import ChamferBox from '../ChamferBox.svelte';
  import DragHandle from '../dnd/DragHandle.svelte';
  import { dropBox, type DragBoxData } from '../dnd/actions';
  import type { EventID, MomentID } from '../types';
  import type { Edge } from '../reorder';

  let {
    eventId,
    momentId,
    label,
    onReorder,
    onHoverChange,
  }: {
    eventId: EventID;
    momentId: MomentID;
    label: string;
    onReorder: (draggedEventId: EventID, targetEventId: EventID, edge: Edge) => void;
    onHoverChange: (edge: Edge | null) => void;
  } = $props();

  const dragData: DragBoxData = $derived({ level: 'event', id: eventId, containerId: momentId });

  // Same-moment reorder only, same shape as MomentBox's same-sequence
  // check — there's no cross-moment drag behavior at this level.
  function canDrop(source: DragBoxData): boolean {
    return source.level === 'event' && source.containerId === momentId && source.id !== eventId;
  }

  function handleDrop(source: DragBoxData, edge: Edge) {
    onReorder(source.id, eventId, edge);
  }
</script>

<div
  class="event-drag-box"
  data-drag-box
  use:dropBox={{ data: () => dragData, canDrop, onDrop: handleDrop, onHoverChange }}
>
  <DragHandle label="Drag to reorder event" data={() => dragData} />
  <ChamferBox tag="span" size="sm" class="event-chip">
    {label}
  </ChamferBox>
</div>

<style>
  /* Same plain-wrapper-for-drag-purposes pattern as MomentBox's
     .moment-drag-box (use: directives can't apply through a component
     boundary onto ChamferBox itself). inline-flex, not block, so these
     still flow left-to-right and wrap within .moment-events' row. */
  .event-drag-box {
    display: inline-flex;
    align-items: center;
    gap: 0.1rem;
  }

  /* One step further recessed than the moment box it lives inside
     (--color-bg vs. the moment's --color-panel-bg) — continuing the
     same alternating-tint mechanism as MomentBox and, before that,
     MomentSequenceBlock (see a5a3fae). --chamfer-fill inherits down the
     DOM, so this must be set explicitly rather than left to ChamferBox's
     own default. */
  :global(.event-chip) {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    font-size: 0.78rem;
    --chamfer-fill: var(--color-bg);
  }
</style>
