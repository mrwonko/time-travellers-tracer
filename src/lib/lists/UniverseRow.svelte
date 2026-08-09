<script lang="ts">
  import IconButton from '../IconButton.svelte';
  import UuidTag from '../UuidTag.svelte';
  import type { StoryUniverse } from '../types';

  // Row-scoped edit state (not a list-level `editingId`) is what lets
  // multiple rows be edited simultaneously without one edit stomping
  // another's in-progress draft — each row is its own component
  // instance, so its `editing`/`editLabel` state is naturally
  // independent of every other row's.
  let {
    universe,
    eventCount,
    deleteDisabled = false,
    onSave,
    onDelete,
  }: {
    universe: StoryUniverse;
    eventCount: number;
    deleteDisabled?: boolean;
    onSave: (label: string | undefined) => void;
    onDelete: () => void;
  } = $props();

  let editing = $state(false);
  let editLabel = $state('');

  function startEdit() {
    editLabel = universe.label ?? '';
    editing = true;
  }
  function save() {
    onSave(editLabel.trim() || universe.label);
    editing = false;
  }
  function cancel() {
    editing = false;
  }
</script>

<tr>
  {#if editing}
    <td>
      <input type="text" class="field" bind:value={editLabel} onkeydown={(e) => e.key === 'Enter' && save()} />
    </td>
    <td class="mono">{eventCount}</td>
    <td class="actions">
      <IconButton icon="save" label="Save universe" onclick={save} />
      <IconButton icon="x" label="Cancel edit" onclick={cancel} />
    </td>
  {:else}
    <td>{universe.label} <UuidTag id={universe.id} /></td>
    <td class="mono">{eventCount}</td>
    <td class="actions">
      <IconButton icon="edit" label="Edit universe" onclick={startEdit} />
      <IconButton
        icon="x"
        label={deleteDisabled ? 'At least one universe is required' : 'Delete universe'}
        onclick={onDelete}
        disabled={deleteDisabled}
      />
    </td>
  {/if}
</tr>

<style>
  .actions {
    display: flex;
    gap: 0.4rem;
  }
</style>
