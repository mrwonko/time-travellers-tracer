// The one *active* Story, module-level runes store (same idiom as
// toastQueue.svelte.ts / dragState.svelte.ts — plain exported `$state`, no
// Svelte `writable`, no context/provider), autosaved to localStorage on
// every change (spec §10). Multi-story support (spec's "1 story = 1 JSON
// file") layers a small `registry` on top: each story's document lives at
// its own localStorage key (storyStorageKey(id)), and `story`/`activeStoryId`
// always reflect whichever one is currently open — switched via
// switchToStory(), driven by the URL (Editor.svelte's route param), not
// called directly from UI.
import {
  STORAGE_KEY,
  REGISTRY_STORAGE_KEY,
  CURRENT_REGISTRY_SCHEMA_VERSION,
  emptyStory,
  parseStoredDocument,
  serializeStory,
  storyStorageKey,
  emptyRegistry,
  serializeRegistry,
  parseRegistryDocument,
  migrateLegacyDocument,
  type StoryRegistryEntry,
} from './persistence';
import { untrack } from 'svelte';
import { generateId } from './id';
import { pushToast } from './toastQueue.svelte';
import type { Story } from './types';

// Last-opened story id, so a bare `/editor` hit (fresh tab, old bookmark)
// resumes where the user left off instead of always landing on the first
// registry entry.
const LAST_ACTIVE_KEY = 'time-travellers-tracer:lastActiveStoryId';

// No registry and no legacy single-story data — genuinely first run.
function seedFreshRegistry(): StoryRegistryEntry[] {
  const id = generateId();
  const entry: StoryRegistryEntry = { id, name: 'My Story', updatedAt: new Date().toISOString() };
  localStorage.setItem(storyStorageKey(id), serializeStory(emptyStory()));
  localStorage.setItem(
    REGISTRY_STORAGE_KEY,
    serializeRegistry({ schemaVersion: CURRENT_REGISTRY_SCHEMA_VERSION, stories: [entry] }),
  );
  return [entry];
}

function loadRegistry(): StoryRegistryEntry[] {
  const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
  if (raw !== null) {
    try {
      return parseRegistryDocument(raw);
    } catch (err) {
      // Same "leave the corrupt entry alone" reasoning as loadStoryDoc
      // below — only a real write (e.g. creating a story) overwrites it.
      console.warn('Saved story list could not be loaded, starting fresh.', err);
      pushToast('Your saved story list could not be loaded — starting fresh.');
      return seedFreshRegistry();
    }
  }

  const legacyRaw = localStorage.getItem(STORAGE_KEY);
  if (legacyRaw !== null) {
    try {
      const { storyId, storedDoc, registry } = migrateLegacyDocument(legacyRaw);
      localStorage.setItem(storyStorageKey(storyId), JSON.stringify(storedDoc, null, 2));
      localStorage.setItem(REGISTRY_STORAGE_KEY, serializeRegistry(registry));
      localStorage.removeItem(STORAGE_KEY);
      return registry.stories;
    } catch (err) {
      console.warn('Saved story could not be migrated, starting fresh.', err);
      pushToast('Your saved story could not be loaded — starting fresh.');
      return seedFreshRegistry();
    }
  }

  return seedFreshRegistry();
}

function pickInitialActiveId(stories: StoryRegistryEntry[]): string {
  const last = localStorage.getItem(LAST_ACTIVE_KEY);
  if (last && stories.some((s) => s.id === last)) return last;
  return stories[0]?.id ?? '';
}

function loadStoryDoc(id: string): Story {
  const raw = localStorage.getItem(storyStorageKey(id));
  if (raw === null) return emptyStory();

  try {
    return parseStoredDocument(raw);
  } catch (err) {
    console.warn('Saved story could not be loaded, starting fresh.', err);
    pushToast('Your saved story could not be loaded — starting with a blank one.');
    return emptyStory();
  }
}

export const registry = $state<StoryRegistryEntry[]>(loadRegistry());
export const activeStoryId = $state({ value: pickInitialActiveId(registry) });
export const story = $state<Story>(loadStoryDoc(activeStoryId.value));

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
  story.timelines = next.timelines;
}

function persistRegistry(): void {
  localStorage.setItem(
    REGISTRY_STORAGE_KEY,
    serializeRegistry({ schemaVersion: CURRENT_REGISTRY_SCHEMA_VERSION, stories: registry }),
  );
}

// Set right before switching stories so the autosave effect below can
// skip the one spurious "save" that loading a story into `story` would
// otherwise trigger (it would just re-write back what was just read —
// harmless, but it'd also flash StoryToolbar's "SAVED" indicator right
// when the user switched, not when they actually edited anything).
let suppressNextAutosave = false;

// Driven by Editor.svelte's route param, not called directly from the
// picker UI — see story.svelte.ts's module comment.
export function switchToStory(id: string): void {
  if (id === activeStoryId.value) return;
  const loaded = loadStoryDoc(id);
  suppressNextAutosave = true;
  activeStoryId.value = id;
  replaceStory(loaded);
  localStorage.setItem(LAST_ACTIVE_KEY, id);
}

// `seed` lets "load example" reuse this directly (createStory(name, demoStory()))
// instead of a separate code path.
export function createStory(name: string, seed: Story = emptyStory()): string {
  const id = generateId();
  localStorage.setItem(storyStorageKey(id), serializeStory(seed));
  registry.push({ id, name, updatedAt: new Date().toISOString() });
  persistRegistry();
  return id;
}

export function renameStory(id: string, name: string): void {
  const entry = registry.find((s) => s.id === id);
  if (!entry) return;
  entry.name = name;
  persistRegistry();
}

export interface DeletedStory {
  entry: StoryRegistryEntry;
  index: number;
  raw: string | null;
}

// Refuses to delete the last remaining story (mirrors TimelineList's
// last-timeline guard) — the UI is expected to disable the control before
// this is ever reached, this is the defensive backstop at the actual
// mutation point (same two-layer pattern as EventList's timeline check).
// If `id` is the active story, the caller (StoryPicker) is responsible for
// navigating to a different one first — not this function's concern.
//
// Whole-story deletion is real data loss, same category as an
// Event/Observer/Timeline delete — those get an undo toast rather than a
// confirm() dialog, so this returns everything needed to reconstruct the
// deleted story (see restoreDeletedStory below) instead of doing that
// itself, since the undo toast is owned by the calling UI (StoryPicker),
// same split as TimelineList's own pushUndo call.
export function deleteStory(id: string): DeletedStory | undefined {
  if (registry.length <= 1) {
    pushToast('At least one story must remain.');
    return undefined;
  }
  const index = registry.findIndex((s) => s.id === id);
  if (index === -1) return undefined;

  const entry = registry[index];
  const raw = localStorage.getItem(storyStorageKey(id));
  registry.splice(index, 1);
  localStorage.removeItem(storyStorageKey(id));
  persistRegistry();
  return { entry, index, raw };
}

export function restoreDeletedStory(entry: StoryRegistryEntry, index: number, raw: string | null): void {
  if (raw !== null) localStorage.setItem(storyStorageKey(entry.id), raw);
  registry.splice(Math.min(index, registry.length), 0, entry);
  persistRegistry();
}

// $effect.root: the documented escape hatch for a reactive effect outside
// any component's lifecycle — same idea as dragState.svelte.ts's
// initDragMonitor(), but for a write-on-change effect instead of an event
// listener. Runs once at module load.
$effect.root(() => {
  // An $effect also runs once immediately on creation, not just on later
  // changes. Skipping that first run is what actually makes the "leave a
  // corrupt localStorage entry alone until a genuine edit" promise above
  // true — without this, loadStoryDoc()'s fallback to emptyStory() would
  // autosave over the corrupt entry instantly, before the user ever
  // touches anything.
  let isFirstRun = true;
  $effect(() => {
    const serialized = serializeStory(story);
    const id = activeStoryId.value;
    if (isFirstRun) {
      isFirstRun = false;
      return;
    }
    if (suppressNextAutosave) {
      suppressNextAutosave = false;
      return;
    }
    localStorage.setItem(storyStorageKey(id), serialized);
    saveCount.value++;

    // untrack: this effect's dependencies are `story` + `activeStoryId`
    // only. Reading `registry` here too (via .find()) would fold it into
    // those dependencies, and writing entry.updatedAt a few lines down
    // would then re-trigger this same effect — the exact write-inside-an-
    // effect shape that hit Svelte's effect_update_depth_exceeded guard
    // elsewhere in this codebase (see StoryToolbar.svelte's flashKey
    // comment). untrack keeps the registry touch-up a one-shot side
    // effect instead of a new reactive dependency.
    untrack(() => {
      const entry = registry.find((s) => s.id === id);
      if (entry) {
        entry.updatedAt = new Date().toISOString();
        persistRegistry();
      }
    });
  });
});
