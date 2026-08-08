// Data model per time-travel-viz-spec.md §3. Types only — no persistence
// yet (spec §11 Phase 1, first slice: entry masks before the storage layer).

export type UniverseID = string;
export type EventID = string;
export type ObserverID = string;
export type MomentID = string;

export interface StoryUniverse {
  id: UniverseID;
  label?: string;
}

export interface StoryEvent {
  id: EventID;
  label?: string;
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

export interface StoryObserver {
  id: ObserverID;
  name?: string;
  sequence: Moment[];
}

export interface Story {
  events: StoryEvent[];
  observers: StoryObserver[];
  universes: StoryUniverse[];
}
