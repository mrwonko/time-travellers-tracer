<script lang="ts">
  // Export/import for the one live Story (spec §10: JSON export/import for
  // backup and sharing, alongside autosave). Imports `story`/`replaceStory`
  // directly from the module-level store rather than taking it as a prop —
  // same reasoning as ToastHost importing toastQueue.svelte.ts directly:
  // there's exactly one Story for the whole app right now.
  import IconButton from './IconButton.svelte';
  import { story, replaceStory, saveCount } from './story.svelte';
  import { parseStoredDocument, serializeStory } from './persistence';
  import { pushToast } from './toastQueue.svelte';

  let fileInput: HTMLInputElement | undefined = $state();

  function exportStory() {
    const blob = new Blob([serializeStory(story)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'time-travellers-tracer-story.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function triggerImport() {
    fileInput?.click();
  }

  async function handleFileChosen(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-choosing the same filename later
    if (!file) return;

    const text = await file.text();
    let imported;
    try {
      imported = parseStoredDocument(text);
    } catch (err) {
      pushToast(`Import failed: ${err instanceof Error ? err.message : 'invalid file'}`);
      return;
    }

    const ok = window.confirm('Importing will replace your current story. Continue?');
    if (!ok) return;

    replaceStory(imported);
    pushToast('Story imported.');
  }

  // Save-flash indicator (design-language.md: "at most a fast ~100ms flash
  // for save confirmation" — no persistent "Saving…" state, since local
  // persistence is never really waiting on I/O). Keyed directly off
  // story.svelte.ts's saveCount (bumped once per real autosave, starts at
  // 0 so it's naturally absent before the first save) — no local $state or
  // $effect of its own needed. An earlier version used an $effect to copy
  // saveCount into a local flashKey purely to reuse IconButton's
  // increment-a-counter flash idiom; that write-inside-an-effect shape hit
  // Svelte's effect_update_depth_exceeded guard (confirmed by triggering
  // it live), which keying directly off imported state sidesteps entirely.
</script>

<div class="story-toolbar">
  <IconButton icon="download" label="Export story as JSON" size="sm" onclick={exportStory} />
  <IconButton icon="upload" label="Import story from JSON" size="sm" onclick={triggerImport} />
  <input
    bind:this={fileInput}
    type="file"
    accept="application/json"
    class="file-input"
    tabindex="-1"
    aria-hidden="true"
    onchange={handleFileChosen}
  />
  {#key saveCount.value}
    {#if saveCount.value > 0}
      <span class="save-flash mono" aria-hidden="true">SAVED</span>
    {/if}
  {/key}
</div>

<style>
  .story-toolbar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .file-input {
    /* Never shown — a real, focusable, clickable input is unnecessary
       here since IconButton (triggerImport) already provides the
       accessible control; this one is only a File-picker bridge. */
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }

  .save-flash {
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    color: var(--color-accent-ink);
    opacity: 0;
    animation: save-flash-pulse 900ms var(--ease-standard);
  }

  @keyframes save-flash-pulse {
    0% {
      opacity: 0;
    }
    15% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
</style>
