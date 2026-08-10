// Example closed-loop Story, formerly the hardcoded seed in Editor.svelte.
// Not wired into first-run persistence (that starts empty — see
// story.svelte.ts) — parked here so it can be reintroduced later as a
// one-click "load example" once multi-story support exists, without
// reconstructing it from memory.
import { generateId } from './id';
import type { Story } from './types';

// Small closed-loop example: Voss lives it forward, the Handler lives the
// same stretch inverted, and they meet at the handoff — plus one
// multi-event moment (the Handler witnesses the handoff and the depot fire
// together, as a single simultaneous moment) to demonstrate that a Moment
// isn't always exactly one event. Voss also has a second, unmerged sequence
// — a moment recorded from a separate account before it was clear where it
// falls relative to their other moments (spec §2/§3) — to demonstrate
// multi-sequence observers.
export function demoStory(): Story {
  const primeId = generateId();

  const e1 = generateId();
  const e2 = generateId();
  const e3 = generateId();

  return {
    timelines: [{ id: primeId, label: 'Prime' }],
    events: [
      { id: e1, label: 'Signal received at the depot', predecessors: [], timeline: primeId },
      { id: e2, label: 'Handoff at the overpass', predecessors: [e1], timeline: primeId },
      { id: e3, label: 'Depot burns', predecessors: [e2], timeline: primeId },
    ],
    observers: [
      {
        id: generateId(),
        name: 'K. Voss',
        sequences: [
          {
            id: generateId(),
            moments: [
              { id: generateId(), events: [e1], direction: 'forward' },
              { id: generateId(), events: [e2], direction: 'forward' },
              { id: generateId(), events: [e3], direction: 'forward' },
            ],
          },
          {
            id: generateId(),
            moments: [{ id: generateId(), events: [e3], direction: 'forward' }],
          },
        ],
      },
      {
        id: generateId(),
        name: 'The Handler',
        sequences: [
          {
            id: generateId(),
            moments: [
              { id: generateId(), events: [e3], direction: 'inverted' },
              { id: generateId(), events: [e2, e1], direction: 'inverted' },
            ],
          },
        ],
      },
    ],
  };
}
