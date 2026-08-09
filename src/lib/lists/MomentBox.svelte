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
  import type { Moment } from '../types';

  let {
    moment,
    index,
    eventOptions,
    eventLabel,
    onSave,
    onDelete,
  }: {
    moment: Moment;
    index: number;
    eventOptions: { id: string; label: string }[];
    eventLabel: (id: string) => string;
    onSave: (patch: { events: string[]; direction: 'forward' | 'inverted' }) => void;
    onDelete: () => void;
  } = $props();

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

<ChamferBox size="sm" class="moment-box">
  <div class="moment-header">
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
      <span class="moment-events">{moment.events.map(eventLabel).join(' + ')}</span>
      <DirectionBadge direction={moment.direction} />
    {/if}
  </div>
</ChamferBox>

<style>
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
    font-size: 0.85rem;
  }
</style>
