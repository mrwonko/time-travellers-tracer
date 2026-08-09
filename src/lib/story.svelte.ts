// The one live Story, module-level runes store (same idiom as
// toastQueue.svelte.ts / dragState.svelte.ts — plain exported `$state`, no
// Svelte `writable`, no context/provider), autosaved to localStorage on
// every change (spec §10). First run (nothing saved yet) starts empty, not
// seeded with demoStory() — see demoStory.ts for why that's kept around
// instead of deleted.
import { STORAGE_KEY, emptyStory, parseStoredDocument, serializeStory } from './persistence';
import { pushToast } from './toastQueue.svelte';
import type { Story } from './types';

function loadInitialStory(): Story {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return emptyStory();

  try {
    return parseStoredDocument(raw);
  } catch (err) {
    // Deliberately don't overwrite the corrupt localStorage entry here —
    // only the next real edit's autosave does that. Leaves room to recover
    // the raw text by hand if it turns out to matter.
    console.warn('Saved story could not be loaded, starting fresh.', err);
    pushToast('Your saved story could not be loaded — starting with a blank one.');
    return emptyStory();
  }
}

export const story = $state<Story>(loadInitialStory());

// Bumped once per real autosave — a cheap primitive for anything that just
// wants to react to "a save happened" (StoryToolbar's flash indicator)
// without doing its own separate deep read of `story` to detect changes.
export const saveCount = $state({ value: 0 });

// Property assignment (not reassigning the `story` export itself, which
// isn't possible across module boundaries) — same pattern already used
// throughout the editor, e.g. ObserverCard's `observer.sequences = ...`.
export function replaceStory(next: Story): void {
  story.events = next.events;
  story.observers = next.observers;
  story.universes = next.universes;
}

// $effect.root: the documented escape hatch for a reactive effect outside
// any component's lifecycle — same idea as dragState.svelte.ts's
// initDragMonitor(), but for a write-on-change effect instead of an event
// listener. Runs once at module load.
$effect.root(() => {
  // An $effect also runs once immediately on creation, not just on later
  // changes. Skipping that first run is what actually makes the "leave a
  // corrupt localStorage entry alone until a genuine edit" promise above
  // true — without this, loadInitialStory()'s fallback to emptyStory()
  // would autosave over the corrupt entry instantly, before the user ever
  // touches anything.
  let isFirstRun = true;
  $effect(() => {
    const serialized = serializeStory(story);
    if (isFirstRun) {
      isFirstRun = false;
      return;
    }
    localStorage.setItem(STORAGE_KEY, serialized);
    saveCount.value++;
  });
});
