// Frozen. This is the permanent record of what schemaVersion 1 of the
// stored Story document looked like — once its structural hash is
// recorded in schemaHistory.test.ts, this file must never be edited
// again. Existing persisted/exported documents were written against
// exactly this shape; a later version (schema/v2.ts, etc.) supersedes it
// for new documents, but parseStoredDocument still needs this one to read
// old data and migrate it forward. See schema/versions.ts and
// persistence.ts.
//
// No `.describe()` calls anywhere below — those become JSON Schema
// `description` metadata and would fold into the structural hash,
// defeating the point of hashing the *shape* rather than the source text.
// Context for a field goes in a plain `//` comment instead, which never
// enters the zod schema object.
import { z } from 'zod';

export const universeIdV1Schema = z.string();
export const eventIdV1Schema = z.string();
export const observerIdV1Schema = z.string();
export const momentIdV1Schema = z.string();
export const sequenceIdV1Schema = z.string();

export const storyUniverseV1Schema = z.object({
  id: universeIdV1Schema,
  label: z.string().optional(),
});

export const storyEventV1Schema = z.object({
  id: eventIdV1Schema,
  label: z.string(),
  // Free text (e.g. local time-of-day, other notes) — separate from
  // `label`, which is the short display name used everywhere else.
  description: z.string().optional(),
  predecessors: z.array(eventIdV1Schema),
  universe: universeIdV1Schema,
});

export const momentV1Schema = z.object({
  id: momentIdV1Schema,
  events: z.array(eventIdV1Schema),
  direction: z.enum(['forward', 'inverted']),
});

export const momentSequenceV1Schema = z.object({
  id: sequenceIdV1Schema,
  moments: z.array(momentV1Schema),
});

export const storyObserverV1Schema = z.object({
  id: observerIdV1Schema,
  name: z.string(),
  sequences: z.array(momentSequenceV1Schema),
});

export const storyV1Schema = z.object({
  events: z.array(storyEventV1Schema),
  observers: z.array(storyObserverV1Schema),
  universes: z.array(storyUniverseV1Schema),
});

export const storedDocumentV1Schema = z.object({
  schemaVersion: z.literal(1),
  story: storyV1Schema,
});
