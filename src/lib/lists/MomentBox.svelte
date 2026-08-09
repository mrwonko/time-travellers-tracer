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
  import type { Moment, MomentID, SequenceID } from '../types';
  import type { Edge } from '../reorder';

  let {
    moment,
    index,
    sequenceId,
    eventOptions,
    eventLabel,
    onSave,
    onDelete,
    onReorder,
    onMergeInto,
  }: {
    moment: Moment;
    index: number;
    sequenceId: SequenceID;
    eventOptions: { id: string; label: string }[];
    eventLabel: (id: string) => string;
    onSave: (patch: { events: string[]; direction: 'forward' | 'inverted' }) => void;
    onDelete: () => void;
    onReorder: (draggedMomentId: MomentID, targetMomentId: MomentID, edge: Edge) => void;
    onMergeInto: (sourceSequenceId: SequenceID, targetMomentId: MomentID, edge: Edge) => void;
  } = $props();

  const dragData: DragBoxData = $derived({ level: 'moment', id: moment.id, containerId: sequenceId });

  // Two different sources can land here, told apart by level: a same-
  // sequence moment (-> reorder) or a whole other sequence dropped onto
  // this box (-> merge-splice at this position). Dragging a moment
  // directly between sequences isn't in scope (only whole-sequence
  // merge-splice is), so a 'moment' source is still same-sequence-only.
  function canDrop(source: DragBoxData): boolean {
    if (source.level === 'moment') return source.containerId === sequenceId && source.id !== moment.id;
    if (source.level === 'sequence') return source.id !== sequenceId;
    return false;
  }

  let hoverEdge = $state<Edge | null>(null);

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
  data-drag-box
  use:dropBox={{ data: () => dragData, canDrop, onDrop: handleDrop, onHoverChange: (edge) => (hoverEdge = edge) }}
>
  <ChamferBox size="sm" class="moment-box">
    <div class="moment-header">
      <DragHandle label="Drag to reorder moment" data={() => dragData} />
      <span class="moment-index mono">#{index}</span>
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
            <EventChip label={eventLabel(eventId)} />
          {/each}
        </div>
        <DirectionBadge direction={moment.direction} />
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

  .moment-drag-box::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--color-accent);
    opacity: 0;
    pointer-events: none;
  }

  .moment-drag-box.drop-top::before {
    top: -0.25rem;
    opacity: 1;
  }

  .moment-drag-box.drop-bottom::before {
    bottom: -0.25rem;
    opacity: 1;
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
