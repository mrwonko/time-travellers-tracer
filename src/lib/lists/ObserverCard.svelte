<script lang="ts">
  // TODO: this row-per-entity edit pattern (own local `editing`/draft
  // state, Save/Cancel via callback props) repeats near-identically
  // across EventRow, UniverseRow, and here/MomentRow. Svelte 5 supports
  // a generic "editable list" component for this (a script block with a
  // generics="T" attribute, plus snippet props for per-column render
  // logic), but that's a real shared-shape design decision, not
  // attempted yet with only 3 call sites to validate it against —
  // revisit if/when a 4th consumer shows up. See PR review thread on the
  // old ObserverList.svelte:193.
  import { generateId } from '../id';
  import IconButton from '../IconButton.svelte';
  import UuidTag from '../UuidTag.svelte';
  import DirectionToggle from '../DirectionToggle.svelte';
  import MultiSelectCombobox from '../MultiSelectCombobox.svelte';
  import CollapsiblePanel from '../CollapsiblePanel.svelte';
  import MomentRow from './MomentRow.svelte';
  import { pushUndo } from '../toastQueue.svelte';
  import type { StoryObserver, StoryEvent, Moment } from '../types';

  let {
    observer,
    events,
    onSaveName,
    onDelete,
  }: {
    observer: StoryObserver;
    events: StoryEvent[];
    onSaveName: (name: string) => void;
    onDelete: () => void;
  } = $props();

  let eventOptions = $derived(events.map((e) => ({ id: e.id, label: e.label })));
  function eventLabel(id: string): string {
    return events.find((e) => e.id === id)?.label || '(untitled event)';
  }

  let editingName = $state(false);
  let editName = $state('');
  function startEditName() {
    editName = observer.name;
    editingName = true;
  }
  function saveName() {
    onSaveName(editName.trim() || observer.name);
    editingName = false;
  }
  function cancelEditName() {
    editingName = false;
  }

  // events: usually one, but a Moment can hold several simultaneously
  // witnessed events (spec §3) — hence a combobox, not a plain select.
  // Deliberately only a one-time default — doesn't need to track later
  // changes to `events[0]`.
  // svelte-ignore state_referenced_locally
  let newMomentEvents = $state<string[]>(events[0] ? [events[0].id] : []);
  let newMomentDirection = $state<'forward' | 'inverted'>('forward');
  function addMoment() {
    if (!newMomentEvents.length) return;
    const moment: Moment = { id: generateId(), events: newMomentEvents, direction: newMomentDirection };
    observer.sequence = [...observer.sequence, moment];
  }

  function saveMoment(id: string, patch: { events: string[]; direction: 'forward' | 'inverted' }) {
    observer.sequence = observer.sequence.map((m) => (m.id === id ? { ...m, ...patch } : m));
  }

  function removeMoment(id: string) {
    const index = observer.sequence.findIndex((m) => m.id === id);
    if (index === -1) return;
    const item = observer.sequence[index];
    observer.sequence = observer.sequence.filter((m) => m.id !== id);
    pushUndo('Deleted moment', () => {
      const restored = [...observer.sequence];
      restored.splice(index, 0, item);
      observer.sequence = restored;
    });
  }
</script>

<CollapsiblePanel open={false}>
  {#snippet titleSnippet()}
    {#if editingName}
      <input
        type="text"
        class="field observer-name-input"
        bind:value={editName}
        onkeydown={(e) => e.key === 'Enter' && saveName()}
        onclick={(e) => e.stopPropagation()}
      />
    {:else}
      <span class="observer-name">{observer.name} <UuidTag id={observer.id} /></span>
    {/if}
    <span class="moment-count mono">{observer.sequence.length} moment{observer.sequence.length === 1 ? '' : 's'}</span>
  {/snippet}
  {#snippet actions()}
    {#if editingName}
      <IconButton icon="save" label="Save observer" size="sm" onclick={saveName} />
      <IconButton icon="x" label="Cancel edit" size="sm" onclick={cancelEditName} />
    {:else}
      <IconButton icon="edit" label="Edit observer" size="sm" onclick={startEditName} />
      <IconButton icon="x" label="Delete observer" size="sm" onclick={onDelete} />
    {/if}
  {/snippet}

  <div class="moments">
    <table class="data-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Event</th>
          <th>Direction</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {#each observer.sequence as moment, i (moment.id)}
          <MomentRow
            {moment}
            index={i + 1}
            {eventOptions}
            {eventLabel}
            onSave={(patch) => saveMoment(moment.id, patch)}
            onDelete={() => removeMoment(moment.id)}
          />
        {/each}
        <tr class="add-row">
          <td></td>
          <td>
            <MultiSelectCombobox options={eventOptions} bind:selected={newMomentEvents} placeholder="Events…" />
          </td>
          <td>
            <DirectionToggle bind:direction={newMomentDirection} />
          </td>
          <td class="actions">
            <IconButton icon="plus" label="Add moment" variant="accent" size="sm" onclick={addMoment} />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</CollapsiblePanel>

<style>
  .observer-name {
    flex: 1;
  }

  .observer-name-input {
    flex: 1;
    max-width: 20rem;
  }

  .moment-count {
    font-size: 0.72rem;
    opacity: 0.5;
  }

  .moments {
    /* This panel can end up quite narrow (the right-hand column of the
       two-column layout). Scroll rather than clip if content genuinely
       can't compress further — but don't force a min-width, or every
       narrow column scrolls even when the content would actually fit. */
    overflow-x: auto;
  }

  .actions {
    display: flex;
    gap: 0.4rem;
    flex: none;
  }
</style>
