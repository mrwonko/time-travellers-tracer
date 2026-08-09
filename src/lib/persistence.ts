// Versioned JSON persistence format for a Story (spec §10: autosaved to
// localStorage, plus explicit export/import for backup/sharing). Pure
// serialize/parse/migrate logic only — no localStorage access here, so this
// is plain-Node testable like id.ts; see story.svelte.ts for the reactive
// store that actually reads/writes localStorage using these functions.
import { generateId } from './id';
import type { Story } from './types';

export const CURRENT_SCHEMA_VERSION = 1;

// Colocated with the format it keys, rather than in story.svelte.ts, so
// this plain (non-rune) module stays importable from a Node context (e.g.
// Playwright specs seeding localStorage before navigating) without pulling
// in Svelte-compiler-only syntax.
export const STORAGE_KEY = 'time-travellers-tracer:story';

export interface StoredDocument {
  schemaVersion: number;
  story: Story;
}

// `Event.universe` is mandatory (spec §3) — a story with zero universes has
// nowhere valid for a first event to point, so a blank/fresh story starts
// with one nameless universe rather than an empty list. UniverseList.svelte
// refuses to delete the last remaining universe for the same reason, so
// this invariant ("at least one universe always exists") holds from here
// on, not just at creation.
export function emptyStory(): Story {
  return { events: [], observers: [], universes: [{ id: generateId(), label: undefined }] };
}

export function serializeStory(story: Story): string {
  const doc: StoredDocument = { schemaVersion: CURRENT_SCHEMA_VERSION, story };
  return JSON.stringify(doc, null, 2);
}

// Only schemaVersion 1 exists today, so this is an identity passthrough —
// written as its own step (rather than inlined into parseStoredDocument) so
// a future schemaVersion bump has an obvious place to add a real migration
// without restructuring the parse path around it.
function migrate(doc: StoredDocument): Story {
  if (doc.schemaVersion === 1) return doc.story;
  throw new Error(`Unsupported story schemaVersion: ${doc.schemaVersion}`);
}

export function parseStoredDocument(raw: string): Story {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Stored story is not an object');
  }
  const doc = parsed as Partial<StoredDocument>;
  if (typeof doc.schemaVersion !== 'number') {
    throw new Error('Stored story is missing schemaVersion');
  }
  if (typeof doc.story !== 'object' || doc.story === null) {
    throw new Error('Stored story is missing its story field');
  }
  const { events, observers, universes } = doc.story as Partial<Story>;
  if (!Array.isArray(events) || !Array.isArray(observers) || !Array.isArray(universes)) {
    throw new Error('Stored story has malformed events/observers/universes');
  }
  return migrate(doc as StoredDocument);
}
