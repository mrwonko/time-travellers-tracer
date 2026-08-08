<script lang="ts">
  import { generateId } from '../id';
  import IconButton from '../IconButton.svelte';
  import ObserverCard from './ObserverCard.svelte';
  import { pushUndo } from '../toastQueue.svelte';
  import type { StoryObserver, StoryEvent } from '../types';

  let { observers = $bindable(), events }: { observers: StoryObserver[]; events: StoryEvent[] } = $props();

  let newName = $state('');
  function addObserver() {
    if (!newName.trim()) return;
    observers = [...observers, { id: generateId(), name: newName.trim(), sequence: [] }];
    newName = '';
  }

  function saveObserverName(id: string, name: string) {
    observers = observers.map((o) => (o.id === id ? { ...o, name } : o));
  }

  function removeObserver(id: string) {
    const index = observers.findIndex((o) => o.id === id);
    if (index === -1) return;
    const item = observers[index];
    observers = observers.filter((o) => o.id !== id);
    pushUndo(`Deleted "${item.name}"`, () => {
      const restored = [...observers];
      restored.splice(index, 0, item);
      observers = restored;
    });
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

<div class="observer-list">
  {#each observers as observer (observer.id)}
    <ObserverCard
      {observer}
      {events}
      onSaveName={(name) => saveObserverName(observer.id, name)}
      onDelete={() => removeObserver(observer.id)}
    />
  {/each}
</div>

<style>
  .observer-add {
    display: flex;
    gap: 0.6rem;
    margin-bottom: 1rem;
    max-width: 28rem;
  }

  .observer-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
</style>
