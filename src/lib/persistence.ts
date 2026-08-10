// Versioned JSON persistence format for a Story (spec §10: autosaved to
// localStorage, plus explicit export/import for backup/sharing). Pure
// serialize/parse/migrate logic only — no localStorage access here, so this
// is plain-Node testable like id.ts; see story.svelte.ts for the reactive
// store that actually reads/writes localStorage using these functions.
import { z } from 'zod';
import { generateId } from './id';
import type { Story } from './types';
import { SCHEMA_VERSIONS, UPGRADES } from './schema/versions';

export const CURRENT_SCHEMA_VERSION = 2 as const;

// Colocated with the format it keys, rather than in story.svelte.ts, so
// this plain (non-rune) module stays importable from a Node context (e.g.
// Playwright specs seeding localStorage before navigating) without pulling
// in Svelte-compiler-only syntax.
export const STORAGE_KEY = 'time-travellers-tracer:story';

// Every known schemaVersion, as a tagged union keyed by the `schemaVersion`
// field — an unrecognized version fails .safeParse() below on its own,
// with no separate hand-rolled check needed. SCHEMA_VERSIONS is already
// stored as the tuple this needs (schema/versions.ts), so a new version
// only has to be added there, not respelled here too.
const storedDocumentSchema = z.discriminatedUnion('schemaVersion', SCHEMA_VERSIONS);
export type StoredDocument = z.infer<typeof storedDocumentSchema>;

// `Event.timeline` is mandatory (spec §3) — a story with zero timelines has
// nowhere valid for a first event to point, so a blank/fresh story starts
// with one nameless timeline rather than an empty list. TimelineList.svelte
// refuses to delete the last remaining timeline for the same reason, so
// this invariant ("at least one timeline always exists") holds from here
// on, not just at creation.
export function emptyStory(): Story {
  return { events: [], observers: [], timelines: [{ id: generateId(), label: undefined }] };
}

export function serializeStory(story: Story): string {
  const doc: StoredDocument = { schemaVersion: CURRENT_SCHEMA_VERSION, story };
  return JSON.stringify(doc, null, 2);
}

// Walks a parsed document forward one schemaVersion at a time (v1→v2→...)
// until it reaches CURRENT_SCHEMA_VERSION, driven entirely by
// SCHEMA_VERSIONS/UPGRADES (schema/versions.ts) — adding a version never
// touches this function, only that data.
//
// UPGRADES's own elements are typed `(doc: never) => unknown` (see its
// comment) specifically so this loop can index into it generically without
// widening any individual upgrade function — but that means this function
// can't statically know it's calling the *right* one for `current`'s
// actual version. Rather than paper over that with an `as` cast (a claim
// with nothing backing it up), re-validate the result against the full
// schema union via storedDocumentSchema.parse() — a real check, so a
// wrong/buggy upgrade step still fails loudly right here instead of
// silently producing a malformed Story.
function migrate(doc: StoredDocument): Story {
  let current: StoredDocument = doc;
  while (current.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const upgrade = UPGRADES[current.schemaVersion - 1];
    if (!upgrade) throw new Error(`No upgrade path from schemaVersion ${current.schemaVersion}`);
    current = storedDocumentSchema.parse(upgrade(current as never));
  }
  // Re-checked (not asserted) for the same reason as inside the loop: the
  // while condition proves this to *us*, but not to the type checker, so
  // this turns that proof into one it can actually verify, narrowing
  // `current` properly instead of needing a cast on the return below.
  if (current.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(`migrate() exited early at schemaVersion ${current.schemaVersion}`);
  }
  return current.story;
}

export function parseStoredDocument(raw: string): Story {
  const parsed: unknown = JSON.parse(raw);
  const result = storedDocumentSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Stored story is invalid: ${z.prettifyError(result.error)}`);
  }
  return migrate(result.data);
}

// Multi-story support: a small registry document (separate from any single
// story's own StoredDocument above) tracking which stories exist. Each
// story's own document moves to its own key (storyStorageKey(id)); the
// single-story STORAGE_KEY above becomes the *legacy* key, read only by
// migrateLegacyDocument below.
export const CURRENT_REGISTRY_SCHEMA_VERSION = 1;
export const REGISTRY_STORAGE_KEY = 'time-travellers-tracer:index';

export function storyStorageKey(id: string): string {
  return `time-travellers-tracer:story:${id}`;
}

export interface StoryRegistryEntry {
  id: string;
  name: string;
  updatedAt: string;
}

export interface RegistryDocument {
  schemaVersion: number;
  stories: StoryRegistryEntry[];
}

export function emptyRegistry(): RegistryDocument {
  return { schemaVersion: CURRENT_REGISTRY_SCHEMA_VERSION, stories: [] };
}

export function serializeRegistry(registry: RegistryDocument): string {
  return JSON.stringify(registry, null, 2);
}

// Same identity-passthrough-for-now shape as migrate() above, kept as its
// own step for the same reason: an obvious place to add real migration
// logic once a second registry schemaVersion exists.
function migrateRegistry(doc: RegistryDocument): StoryRegistryEntry[] {
  if (doc.schemaVersion === CURRENT_REGISTRY_SCHEMA_VERSION) return doc.stories;
  throw new Error(`Unsupported story registry schemaVersion: ${doc.schemaVersion}`);
}

export function parseRegistryDocument(raw: string): StoryRegistryEntry[] {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Stored story registry is not an object');
  }
  const doc = parsed as Partial<RegistryDocument>;
  if (typeof doc.schemaVersion !== 'number') {
    throw new Error('Stored story registry is missing schemaVersion');
  }
  if (!Array.isArray(doc.stories)) {
    throw new Error('Stored story registry has a malformed stories list');
  }
  return migrateRegistry(doc as RegistryDocument);
}

export interface LegacyMigrationResult {
  storyId: string;
  storedDoc: StoredDocument;
  registry: RegistryDocument;
}

// One-time upgrade from the pre-multi-story single-document format: wraps
// the existing story under a fresh id as the registry's sole entry, named
// "My Story". Pure (no localStorage access) like the rest of this file —
// story.svelte.ts's init logic does the actual read of the legacy key and
// write/remove of the new ones.
export function migrateLegacyDocument(raw: string): LegacyMigrationResult {
  const story = parseStoredDocument(raw);
  const storyId = generateId();
  return {
    storyId,
    storedDoc: { schemaVersion: CURRENT_SCHEMA_VERSION, story },
    registry: {
      schemaVersion: CURRENT_REGISTRY_SCHEMA_VERSION,
      stories: [{ id: storyId, name: 'My Story', updatedAt: new Date().toISOString() }],
    },
  };
}
