// Frozen, same as schema/v1.ts, once its hash is recorded in
// schemaHistory.test.ts — the "frozen" rule isn't about whether a version
// is current, it's about whether its hash has been recorded, since that's
// the point any real document could exist in this shape. Currently also
// CURRENT_SCHEMA_VERSION (persistence.ts) — new documents are written
// directly in this shape — but that's orthogonal to being frozen. A future
// shape change adds a v3.ts and its own upgrade step, never edits this one.
//
// Renames schemaVersion 1's `universe`/`universes` to `timeline`/
// `timelines` (a disconnected "universe" is really just another timeline
// in this model) — see upgradeV1ToV2 below and schema/v1.ts for the shape
// being migrated from.
//
// No `.describe()` calls anywhere below — those become JSON Schema
// `description` metadata and would fold into the structural hash. Context
// goes in a plain `//` comment instead.
import { z } from 'zod';
import type { storedDocumentV1Schema } from './v1.ts';

export const timelineIdV2Schema = z.string();
export const eventIdV2Schema = z.string();
export const observerIdV2Schema = z.string();
export const momentIdV2Schema = z.string();
export const sequenceIdV2Schema = z.string();

export const storyTimelineV2Schema = z.object({
  id: timelineIdV2Schema,
  label: z.string().optional(),
});

export const storyEventV2Schema = z.object({
  id: eventIdV2Schema,
  label: z.string(),
  // Free text (e.g. local time-of-day, other notes) — separate from
  // `label`, which is the short display name used everywhere else.
  description: z.string().optional(),
  predecessors: z.array(eventIdV2Schema),
  timeline: timelineIdV2Schema,
});

export const momentV2Schema = z.object({
  id: momentIdV2Schema,
  events: z.array(eventIdV2Schema),
  direction: z.enum(['forward', 'inverted']),
});

export const momentSequenceV2Schema = z.object({
  id: sequenceIdV2Schema,
  moments: z.array(momentV2Schema),
});

export const storyObserverV2Schema = z.object({
  id: observerIdV2Schema,
  name: z.string(),
  sequences: z.array(momentSequenceV2Schema),
});

export const storyV2Schema = z.object({
  events: z.array(storyEventV2Schema),
  observers: z.array(storyObserverV2Schema),
  timelines: z.array(storyTimelineV2Schema),
});

export const storedDocumentV2Schema = z.object({
  schemaVersion: z.literal(2),
  story: storyV2Schema,
});

// Each version's own upgrade-from-the-previous-version step lives with
// that version's schema, rather than in persistence.ts, so the two stay
// next to each other — collected into schema/versions.ts's UPGRADES,
// which persistence.ts's migrate() walks generically. A pure field
// rename, no other shape change, so this is a straight remap rather than
// a real transformation.
export function upgradeV1ToV2(
  doc: z.infer<typeof storedDocumentV1Schema>,
): z.infer<typeof storedDocumentV2Schema> {
  return {
    schemaVersion: 2,
    story: {
      events: doc.story.events.map(({ universe, ...rest }) => ({ ...rest, timeline: universe })),
      observers: doc.story.observers,
      timelines: doc.story.universes,
    },
  };
}
