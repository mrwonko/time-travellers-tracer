<script lang="ts">
  import { push } from 'svelte-spa-router';
  import { generateId } from './id';
  import Icon from './Icon.svelte';
  import IconButton from './IconButton.svelte';
  import ChamferBox from './ChamferBox.svelte';
  import { demoStory } from './demoStory';
  import { pushUndo } from './toastQueue.svelte';
  import { registry, activeStoryId, createStory, renameStory, deleteStory, restoreDeletedStory } from './story.svelte';

  // Unique per instance — anchor-name/position-anchor is a 1:1 CSS link,
  // same reasoning as MultiSelectCombobox (only one of these exists today,
  // but nothing stops a future second one on the same page).
  const uid = generateId();
  const popoverId = `story-picker-${uid}`;
  const anchorName = `--story-picker-${uid}`;

  let open = $state(false);
  let triggerEl: HTMLButtonElement | undefined = $state();
  let popoverEl: HTMLDivElement | undefined = $state();
  let dropUp = $state(false);
  let popoverMaxHeight = $state<number | undefined>(undefined);

  // A single editingId (not a row-scoped component, unlike UniverseRow) is
  // enough here: this is a small, transient popover list where realistically
  // one entry is renamed at a time, and closing the popover (light-dismiss)
  // already discards any in-progress edit.
  let editingId = $state<string | null>(null);
  let editingName = $state('');

  let activeStory = $derived(registry.find((s) => s.id === activeStoryId.value));

  // Ported from MultiSelectCombobox's own updatePosition — same native
  // `popover` + CSS anchor positioning approach, see its comments for why
  // this isn't done via `position-try: flip-block` instead.
  function updatePosition() {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom);
    const spaceAbove = Math.max(0, rect.top);
    const margin = 8;
    dropUp = spaceBelow < 240 && spaceAbove > spaceBelow;
    popoverMaxHeight = Math.max(80, (dropUp ? spaceAbove : spaceBelow) - margin);
  }

  function handleToggle(event: ToggleEvent) {
    open = event.newState === 'open';
    if (open) {
      editingId = null;
      updatePosition();
    }
  }

  $effect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    window.addEventListener('resize', updatePosition);
    viewport?.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      viewport?.removeEventListener('resize', updatePosition);
    };
  });

  // Navigates only — story.svelte.ts's switchToStory() is driven by
  // Editor.svelte's route param effect, not called directly here (keeps
  // "which story is loaded" driven by the URL, per the module's own doc
  // comment).
  function switchTo(id: string) {
    if (id !== activeStoryId.value) push(`/editor/${id}`);
    popoverEl?.hidePopover();
  }

  function startRename(entry: { id: string; name: string }) {
    editingId = entry.id;
    editingName = entry.name;
  }
  function saveRename() {
    if (editingId && editingName.trim()) renameStory(editingId, editingName.trim());
    editingId = null;
  }
  function cancelRename() {
    editingId = null;
  }

  // Whole-story deletion is real data loss (unlike a reorder), so it gets
  // the same undo-toast treatment as Universe/Event/Observer deletes
  // rather than a confirm() dialog.
  function handleDelete(id: string) {
    const deleted = deleteStory(id);
    if (!deleted) return;
    pushUndo(`Deleted "${deleted.entry.name}"`, () =>
      restoreDeletedStory(deleted.entry, deleted.index, deleted.raw),
    );
    if (id === activeStoryId.value) {
      const next = registry[0];
      if (next) push(`/editor/${next.id}`);
    }
  }

  function handleNewStory() {
    push(`/editor/${createStory('Untitled')}`);
    popoverEl?.hidePopover();
  }

  function handleLoadExample() {
    push(`/editor/${createStory('Example', demoStory())}`);
    popoverEl?.hidePopover();
  }
</script>

<button
  bind:this={triggerEl}
  popovertarget={popoverId}
  type="button"
  class="field story-picker-trigger"
  style="anchor-name: {anchorName}"
  aria-expanded={open}
>
  <span class="mono">{activeStory?.name ?? 'Story'}</span>
  <Icon name="chevron" size={12} />
</button>

<div
  bind:this={popoverEl}
  id={popoverId}
  popover="auto"
  class="story-picker-popover-host"
  class:story-picker-popover-host-up={dropUp}
  style="position-anchor: {anchorName}; {popoverMaxHeight ? `max-height: ${popoverMaxHeight}px;` : ''}"
  ontoggle={handleToggle}
>
  <ChamferBox size="sm" class="story-picker-chamfer">
    <div class="story-picker-inner">
      <ul class="story-picker-list">
        {#each registry as entry (entry.id)}
          <li class:active={entry.id === activeStoryId.value}>
            {#if editingId === entry.id}
              <input
                type="text"
                class="field"
                bind:value={editingName}
                onkeydown={(e) => e.key === 'Enter' && saveRename()}
              />
              <IconButton icon="save" label="Save story name" size="sm" onclick={saveRename} />
              <IconButton icon="x" label="Cancel rename" size="sm" onclick={cancelRename} />
            {:else}
              <button type="button" class="story-picker-item" onclick={() => switchTo(entry.id)}>
                {entry.name}
              </button>
              <IconButton icon="edit" label="Rename story" size="sm" onclick={() => startRename(entry)} />
              <IconButton
                icon="x"
                label={registry.length <= 1 ? 'At least one story is required' : 'Delete story'}
                size="sm"
                disabled={registry.length <= 1}
                onclick={() => handleDelete(entry.id)}
              />
            {/if}
          </li>
        {/each}
      </ul>
      <div class="story-picker-footer">
        <button type="button" class="story-picker-footer-action" onclick={handleNewStory}>
          <Icon name="plus" size={14} />
          <span>New story</span>
        </button>
        <button type="button" class="story-picker-footer-action" onclick={handleLoadExample}>
          <Icon name="plus" size={14} />
          <span>Load example</span>
        </button>
      </div>
    </div>
  </ChamferBox>
</div>

<style>
  .story-picker-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    width: auto;
    cursor: pointer;
  }

  .story-picker-popover-host {
    position-area: bottom span-right;
    margin: 0;
    outline: none;
    z-index: var(--z-popover);
    max-width: min(20rem, 90vw);
    min-width: anchor-size(width);
    width: max-content;
    max-height: min(60vh, 20rem);
  }

  .story-picker-popover-host-up {
    position-area: top span-right;
  }

  .story-picker-popover-host:popover-open {
    display: flex;
    flex-direction: column;
  }

  :global(.story-picker-chamfer) {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .story-picker-inner {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.5rem;
    overflow-y: auto;
    min-height: 0;
  }

  .story-picker-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .story-picker-list li {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0;
  }

  .story-picker-list li.active .story-picker-item {
    font-weight: 600;
  }

  .story-picker-item {
    flex: 1;
    text-align: left;
    background: none;
    border: none;
    padding: 0.4rem 0.3rem;
    cursor: pointer;
    color: inherit;
    font: inherit;
  }

  .story-picker-item:hover,
  .story-picker-item:focus-visible {
    text-decoration: underline;
  }

  .story-picker-footer {
    display: flex;
    flex-direction: column;
    border-top: var(--border-width) solid var(--color-border);
    padding-top: 0.4rem;
  }

  .story-picker-footer-action {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: none;
    border: none;
    padding: 0.4rem 0.3rem;
    cursor: pointer;
    color: inherit;
    font: inherit;
    text-align: left;
  }

  .story-picker-footer-action:hover,
  .story-picker-footer-action:focus-visible {
    opacity: 0.7;
  }
</style>
