<script lang="ts">
  import { generateId } from '../id';
  import IconButton from '../IconButton.svelte';
  import UniverseRow from './UniverseRow.svelte';
  import { pushUndo, pushToast } from '../toastQueue.svelte';
  import type { StoryUniverse, StoryEvent } from '../types';

  let { universes = $bindable(), events }: { universes: StoryUniverse[]; events: StoryEvent[] } = $props();

  function eventsInUniverse(id: string): number {
    return events.filter((e) => e.universe === id).length;
  }

  let newLabel = $state('');
  function add() {
    // The very first universe can be added with a blank label — there's
    // nothing yet to disambiguate it from. Every universe after that
    // needs one, so multiple universes stay tellable apart.
    if (universes.length > 0 && !newLabel.trim()) return;
    universes = [...universes, { id: generateId(), label: newLabel.trim() || undefined }];
    newLabel = '';
  }

  function saveUniverse(id: string, label: string | undefined) {
    universes = universes.map((u) => (u.id === id ? { ...u, label } : u));
  }

  function removeUniverse(id: string) {
    // Event.universe is mandatory (spec §3) — a universe list can never go
    // to zero, or the next event created would have nowhere valid to
    // point (see persistence.ts's emptyStory(), which seeds exactly this
    // one-universe floor for the same reason).
    if (universes.length <= 1) {
      pushToast('At least one universe is required — every event needs one.');
      return;
    }
    const index = universes.findIndex((u) => u.id === id);
    if (index === -1) return;
    const item = universes[index];
    universes = universes.filter((u) => u.id !== id);
    pushUndo(`Deleted "${item.label ?? 'universe'}"`, () => {
      const restored = [...universes];
      restored.splice(index, 0, item);
      universes = restored;
    });
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
      <UniverseRow
        universe={u}
        eventCount={eventsInUniverse(u.id)}
        deleteDisabled={universes.length <= 1}
        onSave={(label) => saveUniverse(u.id, label)}
        onDelete={() => removeUniverse(u.id)}
      />
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
        <IconButton
          icon="plus"
          label="Add universe"
          variant="accent"
          onclick={add}
          disabled={universes.length > 0 && !newLabel.trim()}
        />
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
