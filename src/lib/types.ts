// Data model per time-travel-viz-spec.md §3. These are z.infer<> aliases
// of the *current* schema version's zod schema (schema/v2.ts today) —
// the schema module is the single source of truth for the shape, this
// file just names the current version's inferred types for the rest of
// the app to import, so the shape isn't hand-duplicated here too. See
// schema/versions.ts for the full version history and persistence.ts for
// how older versions get migrated forward to this one.
import type { z } from 'zod';
import type {
  timelineIdV2Schema,
  eventIdV2Schema,
  observerIdV2Schema,
  momentIdV2Schema,
  sequenceIdV2Schema,
  storyTimelineV2Schema,
  storyEventV2Schema,
  momentV2Schema,
  momentSequenceV2Schema,
  storyObserverV2Schema,
  storyV2Schema,
} from './schema/v2.ts';

export type TimelineID = z.infer<typeof timelineIdV2Schema>;
export type EventID = z.infer<typeof eventIdV2Schema>;
export type ObserverID = z.infer<typeof observerIdV2Schema>;
export type MomentID = z.infer<typeof momentIdV2Schema>;
export type SequenceID = z.infer<typeof sequenceIdV2Schema>;

export type StoryTimeline = z.infer<typeof storyTimelineV2Schema>;

// `description` is free text (e.g. local time-of-day, other notes) —
// separate from `label`, which is the short display name used everywhere
// else (predecessor lists, moment displays). Not used by any algorithm,
// same spirit as `label` itself.
export type StoryEvent = z.infer<typeof storyEventV2Schema>;

export type Moment = z.infer<typeof momentV2Schema>;

// A fragment of an observer's personal order. An observer can have more
// than one — spec §2/§3 — because a moment is often recorded before its
// position relative to that observer's *other* recorded moments is known.
// Relative order between an observer's sequences is unknown until merged
// into one.
export type MomentSequence = z.infer<typeof momentSequenceV2Schema>;

export type StoryObserver = z.infer<typeof storyObserverV2Schema>;

export type Story = z.infer<typeof storyV2Schema>;
