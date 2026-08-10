// Data model per time-travel-viz-spec.md §3. Types only — no persistence
// yet (spec §11 Phase 1, first slice: entry masks before the storage layer).

export type UniverseID = string;
export type EventID = string;
export type ObserverID = string;
export type MomentID = string;
export type SequenceID = string;

export interface StoryUniverse {
  id: UniverseID;
  label?: string;
}

export interface StoryEvent {
  id: EventID;
  label: string;
  // Free text for now (e.g. local time-of-day, other notes) — separate
  // from `label`, which is the short display name used everywhere else
  // (predecessor lists, moment displays). Not used by any algorithm,
  // same spirit as `label` itself.
  description?: string;
  predecessors: EventID[];
  universe: UniverseID;
}

export interface Moment {
  id: MomentID;
  events: EventID[];
  direction: 'forward' | 'inverted';
}

// A fragment of an observer's personal order. An observer can have more
// than one — spec §2/§3 — because a moment is often recorded before its
// position relative to that observer's *other* recorded moments is known.
// Relative order between an observer's sequences is unknown until merged
// into one.
export interface MomentSequence {
  id: SequenceID;
  moments: Moment[];
}

export interface StoryObserver {
  id: ObserverID;
  name: string;
  sequences: MomentSequence[];
}

export interface Story {
  events: StoryEvent[];
  observers: StoryObserver[];
  universes: StoryUniverse[];
}

// --- Compile-time parity check against schema/v1.ts ----------------------
// Proves the hand-written Story above and schema/v1.ts's zod-inferred
// shape describe exactly the same type — checked both directions, since
// TS assignability alone is one-directional (e.g. an extra optional field
// on one side wouldn't otherwise be caught). If schema/v1.ts is missing a
// field, has an extra one, or types one differently, one of the two
// `satisfies` checks below fails to compile. Structural typing makes this
// recursive, so checking the top-level Story is enough to cover every
// nested type (StoryEvent, Moment, etc.) too — no need to repeat this
// per sub-type. Deleted in the next commit, which replaces Story et al.
// with the inferred type directly — at that point there's nothing left to
// compare against.
import type { z } from 'zod';
import type { storyV1Schema } from './schema/v1.ts';

declare const _storyValue: Story;
_storyValue satisfies z.infer<typeof storyV1Schema>;
declare const _storyFromSchema: z.infer<typeof storyV1Schema>;
_storyFromSchema satisfies Story;
