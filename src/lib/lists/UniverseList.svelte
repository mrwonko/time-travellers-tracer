<script lang="ts">
  import { generateId } from '../id';
  import IconButton from '../IconButton.svelte';
  import UndoToast from '../UndoToast.svelte';
  import UuidTag from '../UuidTag.svelte';
  import type { StoryUniverse, StoryEvent } from '../types';

  let { universes = $bindable(), events }: { universes: StoryUniverse[]; events: StoryEvent[] } = $props();

  function eventsInUniverse(id: string): number {
    return events.filter((e) => e.universe === id).length;
  }

  let newLabel = $state('');
  function add() {
    if (!newLabel.trim()) return;
    universes = [...universes, { id: generateId(), label: newLabel.trim() }];
    newLabel = '';
  }

  let editingId = $state<string | null>(null);
  let editLabel = $state('');
  function startEdit(u: StoryUniverse) {
    editingId = u.id;
    editLabel = u.label ?? '';
  }
  function saveEdit() {
    universes = universes.map((u) => (u.id === editingId ? { ...u, label: editLabel.trim() || u.label } : u));
    editingId = null;
  }
  function cancelEdit() {
    editingId = null;
  }

  let lastDeleted = $state<{ item: StoryUniverse; index: number } | null>(null);
  function remove(id: string) {
    const index = universes.findIndex((u) => u.id === id);
    if (index === -1) return;
    lastDeleted = { item: universes[index], index };
    universes = universes.filter((u) => u.id !== id);
  }
  function undoDelete() {
    if (!lastDeleted) return;
    const restored = [...universes];
    restored.splice(lastDeleted.index, 0, lastDeleted.item);
    universes = restored;
    lastDeleted = null;
  }
</script>

<table class="data-table">
  <thead>
    <tr>
      <th>Label</th>
      <th>Events</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {#each universes as u (u.id)}
      <tr>
        {#if editingId === u.id}
          <td>
            <input
              type="text"
              class="field"
              bind:value={editLabel}
              onkeydown={(e) => e.key === 'Enter' && saveEdit()}
            />
          </td>
          <td class="mono">{eventsInUniverse(u.id)}</td>
          <td class="actions">
            <IconButton icon="save" label="Save universe" onclick={saveEdit} />
            <IconButton icon="x" label="Cancel edit" onclick={cancelEdit} />
          </td>
        {:else}
          <td>{u.label} <UuidTag id={u.id} /></td>
          <td class="mono">{eventsInUniverse(u.id)}</td>
          <td class="actions">
            <IconButton icon="edit" label="Edit universe" onclick={() => startEdit(u)} />
            <IconButton icon="x" label="Delete universe" onclick={() => remove(u.id)} />
          </td>
        {/if}
      </tr>
    {/each}
    <tr class="add-row">
      <td>
        <input
          type="text"
          class="field"
          placeholder="New universe label…"
          bind:value={newLabel}
          onkeydown={(e) => e.key === 'Enter' && add()}
        />
      </td>
      <td></td>
      <td class="actions">
        <IconButton icon="plus" label="Add universe" variant="accent" onclick={add} disabled={!newLabel.trim()} />
      </td>
    </tr>
  </tbody>
</table>

{#if lastDeleted}
  <UndoToast
    message={`Deleted "${lastDeleted.item.label ?? 'universe'}"`}
    onUndo={undoDelete}
    onDismiss={() => (lastDeleted = null)}
  />
{/if}

<style>
  .actions {
    display: flex;
    gap: 0.4rem;
  }
</style>
