<script lang="ts">
  // A single moment within a sequence fragment, rendered as a box rather
  // than a table row — mirrors MomentSequenceBlock's own header+body
  // ChamferBox shape, so all three nesting levels (sequence/moment/event)
  // look and are built the same way. Row-scoped edit state (not lifted to
  // a list-level `editingMomentId`) is what lets multiple moment boxes be
  // edited simultaneously without one edit stomping another's in-progress
  // draft — carried over unchanged from the table-row version this
  // replaces.
  import IconButton from '../IconButton.svelte';
  import UuidTag from '../UuidTag.svelte';
  import DirectionToggle from '../DirectionToggle.svelte';
  import DirectionBadge from '../DirectionBadge.svelte';
  import MultiSelectCombobox from '../MultiSelectCombobox.svelte';
  import ChamferBox from '../ChamferBox.svelte';
  import EventChip from './EventChip.svelte';
  import DragHandle from '../dnd/DragHandle.svelte';
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

  let hoverEdge = $state<Edge | null>(null);

  // Any box that would accept the in-flight drag shows a subtle dashed
  // outline (see .potential-target below) — not just the one currently
  // under the pointer — so it's clear up front where a drop is even
  // possible, rather than only discovering valid targets by hovering
  // each one in turn. Turns into the brighter hoverEdge indicator above
  // once this box specifically becomes the insertion point.
  let isPotentialTarget = $derived.by(() => {
    const dragging = getDragging();
    return dragging !== null && canDrop(dragging);
  });

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
</script>

<div
  class="moment-drag-box"
  class:drop-top={hoverEdge === 'top'}
  class:drop-bottom={hoverEdge === 'bottom'}
  class:potential-top={isPotentialTarget && hoverEdge !== 'top'}
  class:potential-bottom={isPotentialTarget && hoverEdge !== 'bottom'}
  data-drag-box
  use:dropBox={{ data: () => dragData, canDrop, onDrop: handleDrop, onHoverChange: (edge) => (hoverEdge = edge) }}
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
          {#each moment.events as eventId (eventId)}
            <EventChip
              {eventId}
              momentId={moment.id}
              label={eventLabel(eventId)}
              onReorder={(draggedId, targetId, edge) => onReorderEvents(draggedId, targetId, edge)}
            />
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
     itself. No layout effect of its own (no padding/margin), just the
     insertion-indicator bar drawn in the gap above/below on hover. */
  .moment-drag-box {
    position: relative;
  }

  /* One insertion-line indicator per possible edge (::before = top/
     before, ::after = bottom/after) — both exist on every box always,
     invisible (transparent) by default, so no extra markup is needed for
     the three states below. */
  .moment-drag-box::before,
  .moment-drag-box::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 0;
    border-top: 2px solid transparent;
    pointer-events: none;
  }

  .moment-drag-box::before {
    top: -0.25rem;
  }

  .moment-drag-box::after {
    bottom: -0.25rem;
  }

  /* Bright, solid: this exact edge is the insertion point under the
     pointer right now. */
  .moment-drag-box.drop-top::before,
  .moment-drag-box.drop-bottom::after {
    border-top-color: var(--color-accent);
  }

  /* Subtle dashed: shown at each of this box's possible insertion points
     independently while a compatible drag is in flight — so every place a
     drop could land is visible up front, not just discoverable by
     hovering each box in turn. Each edge only stops being dashed (and
     turns into the single bright line above) once *that specific* edge
     becomes the live hover target — hovering one edge must not blank out
     the other edge's hint, it's still a valid drop spot. */
  .moment-drag-box.potential-top::before {
    border-top-style: dashed;
    border-top-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
  }

  .moment-drag-box.potential-bottom::after {
    border-top-style: dashed;
    border-top-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
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
    gap: 0.35rem;
    flex-wrap: wrap;
  }
</style>
