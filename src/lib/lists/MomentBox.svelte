<script lang="ts">
  // A single moment within a sequence fragment, rendered as a box rather
  // than a table row — mirrors MomentSequenceBlock's own header+body
  // ChamferBox shape, so all three nesting levels (sequence/moment/event)
  // look and are built the same way. Row-scoped edit state (not lifted to
  // a list-level `editingMomentId`) is what lets multiple moment boxes be
  // edited simultaneously without one edit stomping another's in-progress
  // draft — carried over unchanged from the table-row version this
  // replaces.
  //
  // This box is a drag source and drop target for *itself* (its own
  // top/bottom halves stay the large, real hit-regions — unchanged), but
  // no longer renders its own insertion-line indicator: that's a single
  // shared element per gap, owned by the parent (MomentSequenceBlock),
  // driven by both neighbors' hover state, so a gap touched by two
  // adjacent moments never draws two independently-positioned lines a
  // few pixels apart — see DropIndicatorLine.svelte and
  // MomentSequenceBlock's isGapHovered for the full mechanism. This box
  // just forwards its own raw hover edge upward via onHoverChange
  // instead of rendering anything itself. Its own events list applies
  // the identical pattern one level deeper, with this component as the
  // "parent" for EventChip's gaps.
  import IconButton from '../IconButton.svelte';
  import UuidTag from '../UuidTag.svelte';
  import DirectionToggle from '../DirectionToggle.svelte';
  import DirectionBadge from '../DirectionBadge.svelte';
  import MultiSelectCombobox from '../MultiSelectCombobox.svelte';
  import ChamferBox from '../ChamferBox.svelte';
  import EventChip from './EventChip.svelte';
  import DragHandle from '../dnd/DragHandle.svelte';
  import DropIndicatorLine from '../dnd/DropIndicatorLine.svelte';
  import { dropBox, type DragBoxData } from '../dnd/actions';
  import { getDragging } from '../dnd/dragState.svelte';
  import type { Moment, MomentID, SequenceID, EventID, ObserverID } from '../types';
  import type { Edge } from '../reorder';

  let {
    moment,
    index,
    sequenceId,
    observerId,
    eventOptions,
    eventLabel,
    onSave,
    onDelete,
    onReorder,
    onMergeInto,
    onReorderEvents,
    onHoverChange,
  }: {
    moment: Moment;
    index: number;
    sequenceId: SequenceID;
    observerId: ObserverID;
    eventOptions: { id: string; label: string }[];
    eventLabel: (id: string) => string;
    onSave: (patch: { events: string[]; direction: 'forward' | 'inverted' }) => void;
    onDelete: () => void;
    onReorder: (draggedMomentId: MomentID, targetMomentId: MomentID, edge: Edge) => void;
    onMergeInto: (sourceSequenceId: SequenceID, targetMomentId: MomentID, edge: Edge) => void;
    onReorderEvents: (draggedEventId: EventID, targetEventId: EventID, edge: Edge) => void;
    onHoverChange: (edge: Edge | null) => void;
  } = $props();

  const dragData: DragBoxData = $derived({ level: 'moment', id: moment.id, containerId: sequenceId });

  // Two different sources can land here, told apart by level: a same-
  // sequence moment (-> reorder) or a whole other sequence dropped onto
  // this box (-> merge-splice at this position). Dragging a moment
  // directly between sequences isn't in scope (only whole-sequence
  // merge-splice is), so a 'moment' source is still same-sequence-only.
  // A 'sequence' source's containerId carries the observer id (see
  // MomentSequenceBlock's dragData comment) — required so a sequence
  // from a *different* observer doesn't look like a valid merge target.
  function canDrop(source: DragBoxData): boolean {
    if (source.level === 'moment') return source.containerId === sequenceId && source.id !== moment.id;
    if (source.level === 'sequence') return source.id !== sequenceId && source.containerId === observerId;
    return false;
  }

  function handleDrop(source: DragBoxData, edge: Edge) {
    if (source.level === 'moment') {
      onReorder(source.id, moment.id, edge);
    } else if (source.level === 'sequence') {
      onMergeInto(source.id, moment.id, edge);
    }
  }

  let editing = $state(false);
  let editEvents = $state<string[]>([]);
  let editDirection = $state<'forward' | 'inverted'>('forward');

  function startEdit() {
    editEvents = [...moment.events];
    editDirection = moment.direction;
    editing = true;
  }
  function save() {
    if (!editEvents.length) return;
    onSave({ events: editEvents, direction: editDirection });
    editing = false;
  }
  function cancel() {
    editing = false;
  }

  // This box's own events list — same shared-gap-indicator pattern as
  // MomentSequenceBlock's moments list, one level deeper. No self-
  // exclusion in canDropOnEvents (unlike EventChip's own per-chip
  // canDrop, used for its actual hit target) since a gap isn't tied to
  // one specific chip's identity — reorderEvents' own no-op guard
  // already makes a drop-on-current-position harmless.
  function canDropOnEvents(source: DragBoxData): boolean {
    return source.level === 'event' && source.containerId === moment.id;
  }

  let isEventsPotentialTarget = $derived.by(() => {
    const dragging = getDragging();
    return dragging !== null && canDropOnEvents(dragging);
  });

  let hoveredEvent = $state<{ id: EventID; edge: Edge } | null>(null);

  function updateEventHover(eventId: EventID, edge: Edge | null) {
    if (edge !== null) {
      hoveredEvent = { id: eventId, edge };
    } else if (hoveredEvent?.id === eventId) {
      hoveredEvent = null;
    }
  }

  function isEventGapHovered(beforeId: EventID | null, afterId: EventID | null): boolean {
    if (!hoveredEvent) return false;
    if (afterId !== null && hoveredEvent.id === afterId && hoveredEvent.edge === 'top') return true;
    if (beforeId !== null && hoveredEvent.id === beforeId && hoveredEvent.edge === 'bottom') return true;
    return false;
  }
</script>

<div
  class="moment-drag-box"
  data-drag-box
  use:dropBox={{ data: () => dragData, canDrop, onDrop: handleDrop, onHoverChange }}
>
  <ChamferBox size="sm" class="moment-box">
    <div class="moment-header">
      <DragHandle label="Drag to reorder moment" data={() => dragData} />
      <span class="moment-index mono">#{index}</span>
      {#if !editing}
        <DirectionBadge direction={moment.direction} />
      {/if}
      <UuidTag id={moment.id} />
      <div class="moment-actions">
        {#if editing}
          <IconButton icon="save" label="Save moment" size="sm" onclick={save} />
          <IconButton icon="x" label="Cancel edit" size="sm" onclick={cancel} />
        {:else}
          <IconButton icon="edit" label="Edit moment" size="sm" onclick={startEdit} />
          <IconButton icon="x" label="Delete moment" size="sm" onclick={onDelete} />
        {/if}
      </div>
    </div>
    <div class="moment-body">
      {#if editing}
        <MultiSelectCombobox options={eventOptions} bind:selected={editEvents} placeholder="Events…" />
        <DirectionToggle bind:direction={editDirection} />
      {:else}
        <div class="moment-events">
          <div class="event-gap">
            <DropIndicatorLine
              orientation="vertical"
              potential={isEventsPotentialTarget}
              hovered={isEventGapHovered(null, moment.events[0] ?? null)}
            />
          </div>
          {#each moment.events as eventId, i (eventId)}
            <EventChip
              {eventId}
              momentId={moment.id}
              label={eventLabel(eventId)}
              onReorder={(draggedId, targetId, edge) => onReorderEvents(draggedId, targetId, edge)}
              onHoverChange={(edge) => updateEventHover(eventId, edge)}
            />
            <div class="event-gap">
              <DropIndicatorLine
                orientation="vertical"
                potential={isEventsPotentialTarget}
                hovered={isEventGapHovered(eventId, moment.events[i + 1] ?? null)}
              />
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </ChamferBox>
</div>

<style>
  /* Plain wrapper around the ChamferBox purely so drag-and-drop has an
     element to attach to (data-drag-box / the dropBox action) — use:
     directives only apply to elements written directly in a template,
     not through a component boundary, so this can't live on ChamferBox
     itself. No layout effect of its own (no padding/margin) — the
     insertion-indicator itself lives one level up now (see the big
     comment at the top of this file). */
  .moment-drag-box {
    position: relative;
  }

  /* One step further recessed than the sequence block it lives inside
     (--color-panel-bg vs. the sequence's --color-bg) — same "step back in
     the light/dark elevation direction reads as nested" mechanism as
     a5a3fae, continued one level deeper. --chamfer-fill inherits down the
     DOM, so this must be set explicitly rather than left to ChamferBox's
     own default, or it would keep inheriting the sequence block's
     override instead of alternating back. */
  :global(.moment-box) {
    padding: 0.5rem 0.7rem;
    --chamfer-fill: var(--color-panel-bg);
  }

  .moment-header {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }

  .moment-index {
    font-size: 0.72rem;
    opacity: 0.5;
  }

  .moment-actions {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
    margin-left: auto;
  }

  .moment-body {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-wrap: wrap;
  }

  .moment-events {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }

  /* Fixed-size regardless of potential/hovered state (no layout shift
     when a drag starts — matches the editor's near-zero-motion
     principle), same width as the old flex `gap` it replaces. */
  .event-gap {
    width: 0.35rem;
    align-self: stretch;
  }
</style>
