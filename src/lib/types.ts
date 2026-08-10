// Data model per time-travel-viz-spec.md §3. These are z.infer<> aliases
// of the *current* schema version's zod schema (schema/v1.ts today) —
// the schema module is the single source of truth for the shape, this
// file just names the current version's inferred types for the rest of
// the app to import, so the shape isn't hand-duplicated here too. See
// schema/versions.ts for the full version history and persistence.ts for
// how older versions get migrated forward to this one.
import type { z } from 'zod';
import type {
  universeIdV1Schema,
  eventIdV1Schema,
  observerIdV1Schema,
  momentIdV1Schema,
  sequenceIdV1Schema,
  storyUniverseV1Schema,
  storyEventV1Schema,
  momentV1Schema,
  momentSequenceV1Schema,
  storyObserverV1Schema,
  storyV1Schema,
} from './schema/v1.ts';

export type UniverseID = z.infer<typeof universeIdV1Schema>;
export type EventID = z.infer<typeof eventIdV1Schema>;
export type ObserverID = z.infer<typeof observerIdV1Schema>;
export type MomentID = z.infer<typeof momentIdV1Schema>;
export type SequenceID = z.infer<typeof sequenceIdV1Schema>;

export type StoryUniverse = z.infer<typeof storyUniverseV1Schema>;

// `description` is free text (e.g. local time-of-day, other notes) —
// separate from `label`, which is the short display name used everywhere
// else (predecessor lists, moment displays). Not used by any algorithm,
// same spirit as `label` itself.
export type StoryEvent = z.infer<typeof storyEventV1Schema>;

export type Moment = z.infer<typeof momentV1Schema>;

// A fragment of an observer's personal order. An observer can have more
// than one — spec §2/§3 — because a moment is often recorded before its
// position relative to that observer's *other* recorded moments is known.
// Relative order between an observer's sequences is unknown until merged
// into one.
export type MomentSequence = z.infer<typeof momentSequenceV1Schema>;

export type StoryObserver = z.infer<typeof storyObserverV1Schema>;

export type Story = z.infer<typeof storyV1Schema>;
