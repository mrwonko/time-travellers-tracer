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
