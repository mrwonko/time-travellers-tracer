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
  import ChamferBox from '../ChamferBox.svelte';
  import DragHandle from '../dnd/DragHandle.svelte';
  import { dropBox, type DragBoxData } from '../dnd/actions';
  import { getDragging } from '../dnd/dragState.svelte';
  import type { EventID, MomentID } from '../types';
  import type { Edge } from '../reorder';

  let {
    eventId,
    momentId,
    label,
    onReorder,
  }: {
    eventId: EventID;
    momentId: MomentID;
    label: string;
    onReorder: (draggedEventId: EventID, targetEventId: EventID, edge: Edge) => void;
  } = $props();

  const dragData: DragBoxData = $derived({ level: 'event', id: eventId, containerId: momentId });

  // Same-moment reorder only, same shape as MomentBox's same-sequence
  // check — there's no cross-moment drag behavior at this level.
  function canDrop(source: DragBoxData): boolean {
    return source.level === 'event' && source.containerId === momentId && source.id !== eventId;
  }

  let hoverEdge = $state<Edge | null>(null);

  // Same "show every valid target, not just the hovered one" affordance
  // as MomentBox's isPotentialTarget — see its comment.
  let isPotentialTarget = $derived.by(() => {
    const dragging = getDragging();
    return dragging !== null && canDrop(dragging);
  });

  function handleDrop(source: DragBoxData, edge: Edge) {
    onReorder(source.id, eventId, edge);
  }
</script>

<div
  class="event-drag-box"
  class:drop-before={hoverEdge === 'top'}
  class:drop-after={hoverEdge === 'bottom'}
  class:potential-target={isPotentialTarget && !hoverEdge}
  data-drag-box
  use:dropBox={{ data: () => dragData, canDrop, onDrop: handleDrop, onHoverChange: (edge) => (hoverEdge = edge) }}
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
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.1rem;
  }

  /* Events flow in a horizontal row (unlike the vertical moment/sequence
     lists), so the insertion indicator is a vertical bar to its
     left/right rather than a horizontal one above/below — same
     underlying top='before'/bottom='after' edge data as the other two
     levels (reorder.ts is axis-agnostic), just mapped to the axis this
     level actually scrolls along. */
  .event-drag-box::before,
  .event-drag-box::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 0;
    border-left: 2px solid transparent;
    pointer-events: none;
  }

  .event-drag-box::before {
    left: -0.2rem;
  }

  .event-drag-box::after {
    right: -0.2rem;
  }

  /* Bright, solid: this exact edge is the insertion point under the
     pointer right now. */
  .event-drag-box.drop-before::before,
  .event-drag-box.drop-after::after {
    border-left-color: var(--color-accent);
  }

  /* Subtle dashed: shown at *both* this chip's possible insertion points
     while a compatible drag is in flight and not yet hovering this chip
     specifically — see MomentBox's .potential-target for the full
     rationale (same mechanism, this level's axis). */
  .event-drag-box.potential-target::before,
  .event-drag-box.potential-target::after {
    border-left-style: dashed;
    border-left-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
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
