<script lang="ts">
  import IconButton from '../IconButton.svelte';
  import DirectionToggle from '../DirectionToggle.svelte';
  import DirectionBadge from '../DirectionBadge.svelte';
  import MultiSelectCombobox from '../MultiSelectCombobox.svelte';
  import type { Moment } from '../types';

  // Row-scoped edit state (not a list-level `editingMomentId`) is what
  // lets multiple moment rows be edited simultaneously without one edit
  // stomping another's in-progress draft.
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

<tr>
  {#if editing}
    <td class="mono">{index}</td>
    <td>
      <MultiSelectCombobox options={eventOptions} bind:selected={editEvents} placeholder="Events…" />
    </td>
    <td><DirectionToggle bind:direction={editDirection} /></td>
    <td class="actions">
      <IconButton icon="save" label="Save moment" size="sm" onclick={save} />
      <IconButton icon="x" label="Cancel edit" size="sm" onclick={cancel} />
    </td>
  {:else}
    <td class="mono">{index}</td>
    <td>{moment.events.map(eventLabel).join(' + ')}</td>
    <td>
      <DirectionBadge direction={moment.direction} />
    </td>
    <td class="actions">
      <IconButton icon="edit" label="Edit moment" size="sm" onclick={startEdit} />
      <IconButton icon="x" label="Delete moment" size="sm" onclick={onDelete} />
    </td>
  {/if}
</tr>

<style>
  .actions {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
</style>
