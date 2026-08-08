<script lang="ts">
  import { generateId } from '../id';
  import IconButton from '../IconButton.svelte';
  import UndoToast from '../UndoToast.svelte';
  import UuidTag from '../UuidTag.svelte';
  import MultiSelectCombobox from '../MultiSelectCombobox.svelte';
  import type { StoryEvent, StoryUniverse } from '../types';

  let { events = $bindable(), universes }: { events: StoryEvent[]; universes: StoryUniverse[] } = $props();

  function eventLabel(id: string): string {
    return events.find((e) => e.id === id)?.label || '(untitled event)';
  }

  function universeLabel(id: string): string {
    return universes.find((u) => u.id === id)?.label || '(unlabeled universe)';
  }

  // Excludes the event currently being edited from its own predecessor
  // options — a direct self-loop reads as near-certainly accidental, even
  // though the data model tolerates cycles generally (a cycle alone isn't
  // a paradox, per the spec's satisfiability discussion).
  function optionsExcluding(excludeId: string | null) {
    return events.filter((e) => e.id !== excludeId).map((e) => ({ id: e.id, label: e.label ?? '(untitled event)' }));
  }

  let newLabel = $state('');
  let newDescription = $state('');
  // Deliberately only a one-time default for the add-row's dropdown — it
  // doesn't need to track later changes to `universes[0]`.
  // svelte-ignore state_referenced_locally
  let newUniverse = $state(universes[0]?.id ?? '');
  let newPredecessors = $state<string[]>([]);
  function add() {
    if (!newLabel.trim()) return;
    events = [
      ...events,
      {
        id: generateId(),
        label: newLabel.trim(),
        description: newDescription.trim() || undefined,
        predecessors: newPredecessors,
        universe: newUniverse,
      },
    ];
    newLabel = '';
    newDescription = '';
    newPredecessors = [];
  }

  let editingId = $state<string | null>(null);
  let editLabel = $state('');
  let editDescription = $state('');
  let editUniverse = $state('');
  let editPredecessors = $state<string[]>([]);
  function startEdit(ev: StoryEvent) {
    editingId = ev.id;
    editLabel = ev.label ?? '';
    editDescription = ev.description ?? '';
    editUniverse = ev.universe;
    editPredecessors = [...ev.predecessors];
  }
  function saveEdit() {
    events = events.map((ev) =>
      ev.id === editingId
        ? {
            ...ev,
            label: editLabel.trim() || ev.label,
            description: editDescription.trim() || undefined,
            universe: editUniverse,
            predecessors: editPredecessors,
          }
        : ev,
    );
    editingId = null;
  }
  function cancelEdit() {
    editingId = null;
  }

  let lastDeleted = $state<{ item: StoryEvent; index: number } | null>(null);
  function remove(id: string) {
    const index = events.findIndex((e) => e.id === id);
    if (index === -1) return;
    lastDeleted = { item: events[index], index };
    events = events.filter((e) => e.id !== id);
  }
  function undoDelete() {
    if (!lastDeleted) return;
    const restored = [...events];
    restored.splice(lastDeleted.index, 0, lastDeleted.item);
    events = restored;
    lastDeleted = null;
  }
</script>

<table class="data-table">
  <thead>
    <tr>
      <th>Label</th>
      <th>Description</th>
      <th>Universe</th>
      <th>Predecessors</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {#each events as ev (ev.id)}
      <tr>
        {#if editingId === ev.id}
          <td>
            <input
              type="text"
              class="field"
              bind:value={editLabel}
              onkeydown={(e) => e.key === 'Enter' && saveEdit()}
            />
          </td>
          <td>
            <input
              type="text"
              class="field"
              placeholder="e.g. local time…"
              bind:value={editDescription}
              onkeydown={(e) => e.key === 'Enter' && saveEdit()}
            />
          </td>
          <td>
            <select class="field" bind:value={editUniverse}>
              {#each universes as u (u.id)}
                <option value={u.id}>{u.label}</option>
              {/each}
            </select>
          </td>
          <td>
            <MultiSelectCombobox
              options={optionsExcluding(editingId)}
              bind:selected={editPredecessors}
              placeholder="Predecessors…"
            />
          </td>
          <td class="actions">
            <IconButton icon="save" label="Save event" onclick={saveEdit} />
            <IconButton icon="x" label="Cancel edit" onclick={cancelEdit} />
          </td>
        {:else}
          <td>{ev.label} <UuidTag id={ev.id} /></td>
          <td>
            {#if ev.description}
              {ev.description}
            {:else}
              <span class="muted">&mdash;</span>
            {/if}
          </td>
          <td>{universeLabel(ev.universe)}</td>
          <td>
            {#if ev.predecessors.length === 0}
              <span class="muted">&mdash;</span>
            {:else}
              {ev.predecessors.map(eventLabel).join(', ')}
            {/if}
          </td>
          <td class="actions">
            <IconButton icon="edit" label="Edit event" onclick={() => startEdit(ev)} />
            <IconButton icon="x" label="Delete event" onclick={() => remove(ev.id)} />
          </td>
        {/if}
      </tr>
    {/each}
    <tr class="add-row">
      <td>
        <input
          type="text"
          class="field"
          placeholder="New event label…"
          bind:value={newLabel}
          onkeydown={(e) => e.key === 'Enter' && add()}
        />
      </td>
      <td>
        <input
          type="text"
          class="field"
          placeholder="e.g. local time…"
          bind:value={newDescription}
          onkeydown={(e) => e.key === 'Enter' && add()}
        />
      </td>
      <td>
        <select class="field" bind:value={newUniverse}>
          {#each universes as u (u.id)}
            <option value={u.id}>{u.label}</option>
          {/each}
        </select>
      </td>
      <td>
        <MultiSelectCombobox options={optionsExcluding(null)} bind:selected={newPredecessors} placeholder="Predecessors…" />
      </td>
      <td class="actions">
        <IconButton icon="plus" label="Add event" variant="accent" onclick={add} disabled={!newLabel.trim()} />
      </td>
    </tr>
  </tbody>
</table>

{#if lastDeleted}
  <UndoToast
    message={`Deleted "${lastDeleted.item.label ?? 'event'}"`}
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
