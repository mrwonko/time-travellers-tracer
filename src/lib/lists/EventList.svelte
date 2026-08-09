<script lang="ts">
  import { generateId } from '../id';
  import IconButton from '../IconButton.svelte';
  import MultiSelectCombobox from '../MultiSelectCombobox.svelte';
  import EventRow from './EventRow.svelte';
  import { pushUndo } from '../toastQueue.svelte';
  import type { StoryEvent, StoryUniverse } from '../types';

  let { events = $bindable(), universes }: { events: StoryEvent[]; universes: StoryUniverse[] } = $props();

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

  function saveEvent(id: string, patch: { label: string; description: string | undefined; universe: string; predecessors: string[] }) {
    events = events.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev));
  }

  // TODO: deletions also need to cascade — other events reference this
  // one as a predecessor, and observers' moments reference it directly.
  // Both currently just degrade gracefully to a fallback string rather
  // than being cleaned up or blocked. Cascading raises its own questions
  // (confirm first? cascade the undo too?) that are out of scope for this
  // pass — this is a mockup of the entry masks, not the real deletion
  // semantics yet.
  function removeEvent(id: string) {
    const index = events.findIndex((e) => e.id === id);
    if (index === -1) return;
    const item = events[index];
    events = events.filter((e) => e.id !== id);
    pushUndo(`Deleted "${item.label}"`, () => {
      const restored = [...events];
      restored.splice(index, 0, item);
      events = restored;
    });
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
      <EventRow
        event={ev}
        {events}
        {universes}
        onSave={(patch) => saveEvent(ev.id, patch)}
        onDelete={() => removeEvent(ev.id)}
      />
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
        <MultiSelectCombobox
          options={events.map((e) => ({ id: e.id, label: e.label }))}
          bind:selected={newPredecessors}
          placeholder="Predecessors…"
        />
      </td>
      <td class="actions">
        <IconButton icon="plus" label="Add event" variant="accent" onclick={add} disabled={!newLabel.trim()} />
      </td>
    </tr>
  </tbody>
</table>

<style>
  .actions {
    display: flex;
    gap: 0.4rem;
  }
</style>
