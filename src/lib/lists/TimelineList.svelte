<script lang="ts">
  import { generateId } from '../id';
  import IconButton from '../IconButton.svelte';
  import TimelineRow from './TimelineRow.svelte';
  import { pushUndo, pushToast } from '../toastQueue.svelte';
  import type { StoryTimeline, StoryEvent } from '../types';

  let { timelines = $bindable(), events }: { timelines: StoryTimeline[]; events: StoryEvent[] } = $props();

  function eventsInTimeline(id: string): number {
    return events.filter((e) => e.timeline === id).length;
  }

  let newLabel = $state('');
  function add() {
    // The very first timeline can be added with a blank label — there's
    // nothing yet to disambiguate it from. Every timeline after that
    // needs one, so multiple timelines stay tellable apart.
    if (timelines.length > 0 && !newLabel.trim()) return;
    timelines = [...timelines, { id: generateId(), label: newLabel.trim() || undefined }];
    newLabel = '';
  }

  function saveTimeline(id: string, label: string | undefined) {
    timelines = timelines.map((u) => (u.id === id ? { ...u, label } : u));
  }

  function removeTimeline(id: string) {
    // Event.timeline is mandatory (spec §3) — a timeline list can never go
    // to zero, or the next event created would have nowhere valid to
    // point (see persistence.ts's emptyStory(), which seeds exactly this
    // one-timeline floor for the same reason).
    if (timelines.length <= 1) {
      pushToast('At least one timeline is required — every event needs one.');
      return;
    }
    const index = timelines.findIndex((u) => u.id === id);
    if (index === -1) return;
    const item = timelines[index];
    timelines = timelines.filter((u) => u.id !== id);
    pushUndo(`Deleted "${item.label ?? 'timeline'}"`, () => {
      const restored = [...timelines];
      restored.splice(index, 0, item);
      timelines = restored;
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
    {#each timelines as u (u.id)}
      <TimelineRow
        timeline={u}
        eventCount={eventsInTimeline(u.id)}
        deleteDisabled={timelines.length <= 1}
        onSave={(label) => saveTimeline(u.id, label)}
        onDelete={() => removeTimeline(u.id)}
      />
    {/each}
    <tr class="add-row">
      <td>
        <input
          type="text"
          class="field"
          placeholder="New timeline label…"
          bind:value={newLabel}
          onkeydown={(e) => e.key === 'Enter' && add()}
        />
      </td>
      <td></td>
      <td class="actions">
        <IconButton
          icon="plus"
          label="Add timeline"
          variant="accent"
          onclick={add}
          disabled={timelines.length > 0 && !newLabel.trim()}
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
