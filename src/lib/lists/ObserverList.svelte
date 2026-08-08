<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import { generateId } from '../id';
  import Icon from '../Icon.svelte';
  import IconButton from '../IconButton.svelte';
  import UndoToast from '../UndoToast.svelte';
  import UuidTag from '../UuidTag.svelte';
  import DirectionToggle from '../DirectionToggle.svelte';
  import DirectionBadge from '../DirectionBadge.svelte';
  import MultiSelectCombobox from '../MultiSelectCombobox.svelte';
  import type { StoryObserver, StoryEvent, Moment } from '../types';

  let { observers = $bindable(), events }: { observers: StoryObserver[]; events: StoryEvent[] } = $props();

  function eventLabel(id: string): string {
    return events.find((e) => e.id === id)?.label || '(untitled event)';
  }

  let eventOptions = $derived(events.map((e) => ({ id: e.id, label: e.label ?? '(untitled event)' })));

  // events: usually one, but a Moment can hold several simultaneously
  // witnessed events (spec §3) — hence a combobox, not a plain select.
  type PendingMoment = { events: string[]; direction: 'forward' | 'inverted' };
  let pendingMoments = $state<Record<string, PendingMoment>>({});

  function defaultPendingMoment(): PendingMoment {
    return { events: events[0] ? [events[0].id] : [], direction: 'forward' };
  }

  let expanded = $state(new SvelteSet<string>());
  function toggleExpanded(id: string) {
    if (expanded.has(id)) {
      expanded.delete(id);
    } else {
      expanded.add(id);
      if (!pendingMoments[id]) {
        pendingMoments[id] = defaultPendingMoment();
      }
    }
  }

  // --- observer add/edit/delete -------------------------------------
  let newName = $state('');
  function addObserver() {
    if (!newName.trim()) return;
    const id = generateId();
    observers = [...observers, { id, name: newName.trim(), sequence: [] }];
    pendingMoments[id] = defaultPendingMoment();
    expanded.add(id);
    newName = '';
  }

  let editingObserverId = $state<string | null>(null);
  let editName = $state('');
  function startEditObserver(o: StoryObserver) {
    editingObserverId = o.id;
    editName = o.name ?? '';
  }
  function saveEditObserver() {
    observers = observers.map((o) => (o.id === editingObserverId ? { ...o, name: editName.trim() || o.name } : o));
    editingObserverId = null;
  }
  function cancelEditObserver() {
    editingObserverId = null;
  }

  let lastDeletedObserver = $state<{ item: StoryObserver; index: number } | null>(null);
  function removeObserver(id: string) {
    const index = observers.findIndex((o) => o.id === id);
    if (index === -1) return;
    lastDeletedObserver = { item: observers[index], index };
    observers = observers.filter((o) => o.id !== id);
    expanded.delete(id);
    delete pendingMoments[id];
  }
  function undoDeleteObserver() {
    if (!lastDeletedObserver) return;
    const restored = [...observers];
    restored.splice(lastDeletedObserver.index, 0, lastDeletedObserver.item);
    observers = restored;
    lastDeletedObserver = null;
  }

  // --- moments ---------------------------------------------------------
  function addMoment(observer: StoryObserver) {
    const pending = pendingMoments[observer.id];
    if (!pending?.events.length) return;
    const moment: Moment = { id: generateId(), events: pending.events, direction: pending.direction };
    observer.sequence = [...observer.sequence, moment];
  }

  let editingMomentId = $state<string | null>(null);
  let editMomentEvents = $state<string[]>([]);
  let editMomentDirection = $state<'forward' | 'inverted'>('forward');
  function startEditMoment(m: Moment) {
    editingMomentId = m.id;
    editMomentEvents = [...m.events];
    editMomentDirection = m.direction;
  }
  function saveEditMoment(observer: StoryObserver) {
    observer.sequence = observer.sequence.map((m) =>
      m.id === editingMomentId ? { ...m, events: editMomentEvents, direction: editMomentDirection } : m,
    );
    editingMomentId = null;
  }
  function cancelEditMoment() {
    editingMomentId = null;
  }

  let lastDeletedMoment = $state<{ observerId: string; item: Moment; index: number } | null>(null);
  function removeMoment(observer: StoryObserver, id: string) {
    const index = observer.sequence.findIndex((m) => m.id === id);
    if (index === -1) return;
    lastDeletedMoment = { observerId: observer.id, item: observer.sequence[index], index };
    observer.sequence = observer.sequence.filter((m) => m.id !== id);
  }
  function undoDeleteMoment() {
    if (!lastDeletedMoment) return;
    const observer = observers.find((o) => o.id === lastDeletedMoment!.observerId);
    if (observer) {
      const restored = [...observer.sequence];
      restored.splice(lastDeletedMoment.index, 0, lastDeletedMoment.item);
      observer.sequence = restored;
    }
    lastDeletedMoment = null;
  }
</script>

<div class="observer-add">
  <input
    type="text"
    class="field"
    placeholder="New observer name…"
    bind:value={newName}
    onkeydown={(e) => e.key === 'Enter' && addObserver()}
  />
  <IconButton icon="plus" label="Add observer" variant="accent" size="sm" onclick={addObserver} disabled={!newName.trim()} />
</div>

{#each observers as observer (observer.id)}
  <article class="observer-card">
    <div class="observer-head">
      <button
        type="button"
        class="observer-toggle"
        onclick={() => toggleExpanded(observer.id)}
        aria-expanded={expanded.has(observer.id)}
        aria-label="{expanded.has(observer.id) ? 'Collapse' : 'Expand'} moments for {observer.name}"
      >
        <span class="chevron" class:open={expanded.has(observer.id)}>
          <Icon name="chevron" size={12} />
        </span>
      </button>

      {#if editingObserverId === observer.id}
        <input
          type="text"
          class="field observer-name-input"
          bind:value={editName}
          onkeydown={(e) => e.key === 'Enter' && saveEditObserver()}
        />
      {:else}
        <span class="observer-name">{observer.name} <UuidTag id={observer.id} /></span>
      {/if}

      <span class="moment-count mono">{observer.sequence.length} moment{observer.sequence.length === 1 ? '' : 's'}</span>

      <div class="actions">
        {#if editingObserverId === observer.id}
          <IconButton icon="save" label="Save observer" size="sm" onclick={saveEditObserver} />
          <IconButton icon="x" label="Cancel edit" size="sm" onclick={cancelEditObserver} />
        {:else}
          <IconButton icon="edit" label="Edit observer" size="sm" onclick={() => startEditObserver(observer)} />
          <IconButton icon="x" label="Delete observer" size="sm" onclick={() => removeObserver(observer.id)} />
        {/if}
      </div>
    </div>

    {#if expanded.has(observer.id)}
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
              <tr>
                {#if editingMomentId === moment.id}
                  <td class="mono">{i + 1}</td>
                  <td>
                    <MultiSelectCombobox options={eventOptions} bind:selected={editMomentEvents} placeholder="Events…" />
                  </td>
                  <td><DirectionToggle bind:direction={editMomentDirection} /></td>
                  <td class="actions">
                    <IconButton icon="save" label="Save moment" size="sm" onclick={() => saveEditMoment(observer)} />
                    <IconButton icon="x" label="Cancel edit" size="sm" onclick={cancelEditMoment} />
                  </td>
                {:else}
                  <td class="mono">{i + 1}</td>
                  <td>{moment.events.map(eventLabel).join(' + ')}</td>
                  <td>
                    <DirectionBadge direction={moment.direction} />
                  </td>
                  <td class="actions">
                    <IconButton icon="edit" label="Edit moment" size="sm" onclick={() => startEditMoment(moment)} />
                    <IconButton icon="x" label="Delete moment" size="sm" onclick={() => removeMoment(observer, moment.id)} />
                  </td>
                {/if}
              </tr>
            {/each}
            {#if pendingMoments[observer.id]}
              <tr class="add-row">
                <td></td>
                <td>
                  <MultiSelectCombobox
                    options={eventOptions}
                    bind:selected={pendingMoments[observer.id].events}
                    placeholder="Events…"
                  />
                </td>
                <td>
                  <DirectionToggle bind:direction={pendingMoments[observer.id].direction} />
                </td>
                <td class="actions">
                  <IconButton icon="plus" label="Add moment" variant="accent" size="sm" onclick={() => addMoment(observer)} />
                </td>
              </tr>
            {/if}
          </tbody>
        </table>

        {#if lastDeletedMoment && lastDeletedMoment.observerId === observer.id}
          <UndoToast message="Deleted moment" onUndo={undoDeleteMoment} onDismiss={() => (lastDeletedMoment = null)} />
        {/if}
      </div>
    {/if}
  </article>
{/each}

{#if lastDeletedObserver}
  <UndoToast
    message={`Deleted "${lastDeletedObserver.item.name ?? 'observer'}"`}
    onUndo={undoDeleteObserver}
    onDismiss={() => (lastDeletedObserver = null)}
  />
{/if}

<style>
  .observer-add {
    display: flex;
    gap: 0.6rem;
    margin-bottom: 1rem;
    max-width: 28rem;
  }

  .observer-card {
    border-top: var(--border-width) solid var(--color-border);
    padding-top: 0.75rem;
    margin-top: 0.75rem;
  }

  .observer-card:first-of-type {
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }

  .observer-head {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .observer-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.25rem;
    min-height: 2.25rem;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    flex: none;
  }

  .chevron {
    display: inline-flex;
    opacity: 0.5;
    transition: transform var(--duration-fast) var(--ease-standard);
  }

  .chevron.open {
    transform: rotate(90deg);
  }

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

  .actions {
    display: flex;
    gap: 0.4rem;
    flex: none;
  }

  .moments {
    padding: 0.75rem 0 0.5rem 0.9rem;
    /* This panel can end up quite narrow (the right-hand column of the
       two-column layout). Scroll rather than clip if content genuinely
       can't compress further — but don't force a min-width, or every
       narrow column scrolls even when the content would actually fit. */
    overflow-x: auto;
  }

  .moments .actions {
    flex-wrap: wrap;
  }
</style>
