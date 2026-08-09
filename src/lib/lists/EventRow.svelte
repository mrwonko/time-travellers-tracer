<script lang="ts">
  import IconButton from '../IconButton.svelte';
  import UuidTag from '../UuidTag.svelte';
  import MultiSelectCombobox from '../MultiSelectCombobox.svelte';
  import type { StoryEvent, StoryUniverse } from '../types';

  // Row-scoped edit state (not a list-level `editingId`) is what lets
  // multiple rows be edited simultaneously without one edit stomping
  // another's in-progress draft — each row is its own component
  // instance, so its `editing`/draft state is naturally independent of
  // every other row's.
  let {
    event,
    events,
    universes,
    onSave,
    onDelete,
  }: {
    event: StoryEvent;
    events: StoryEvent[];
    universes: StoryUniverse[];
    onSave: (patch: { label: string; description: string | undefined; universe: string; predecessors: string[] }) => void;
    onDelete: () => void;
  } = $props();

  function eventLabel(id: string): string {
    return events.find((e) => e.id === id)?.label || '(untitled event)';
  }
  function universeLabel(id: string): string {
    return universes.find((u) => u.id === id)?.label || '(unlabeled universe)';
  }

  // Excludes this event from its own predecessor options — a direct
  // self-loop reads as near-certainly accidental, even though the data
  // model tolerates cycles generally (a cycle alone isn't a paradox, per
  // the spec's satisfiability discussion).
  let predecessorOptions = $derived(
    events.filter((e) => e.id !== event.id).map((e) => ({ id: e.id, label: e.label })),
  );

  let editing = $state(false);
  let editLabel = $state('');
  let editDescription = $state('');
  let editUniverse = $state('');
  let editPredecessors = $state<string[]>([]);

  function startEdit() {
    editLabel = event.label;
    editDescription = event.description ?? '';
    editUniverse = event.universe;
    editPredecessors = [...event.predecessors];
    editing = true;
  }
  function save() {
    onSave({
      label: editLabel.trim() || event.label,
      description: editDescription.trim() || undefined,
      universe: editUniverse,
      predecessors: editPredecessors,
    });
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
    <td>
      <input
        type="text"
        class="field"
        placeholder="e.g. local time…"
        bind:value={editDescription}
        onkeydown={(e) => e.key === 'Enter' && save()}
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
      <MultiSelectCombobox options={predecessorOptions} bind:selected={editPredecessors} placeholder="Predecessors…" />
    </td>
    <td class="actions">
      <IconButton icon="save" label="Save event" onclick={save} />
      <IconButton icon="x" label="Cancel edit" onclick={cancel} />
    </td>
  {:else}
    <td>{event.label} <UuidTag id={event.id} /></td>
    <td>
      {#if event.description}
        {event.description}
      {:else}
        <span class="muted">&mdash;</span>
      {/if}
    </td>
    <td>{universeLabel(event.universe)}</td>
    <td>
      {#if event.predecessors.length === 0}
        <span class="muted">&mdash;</span>
      {:else}
        {event.predecessors.map(eventLabel).join(', ')}
      {/if}
    </td>
    <td class="actions">
      <IconButton icon="edit" label="Edit event" onclick={startEdit} />
      <IconButton icon="x" label="Delete event" onclick={onDelete} />
    </td>
  {/if}
</tr>

<style>
  .actions {
    display: flex;
    gap: 0.4rem;
  }
</style>
