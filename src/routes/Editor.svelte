<script lang="ts">
  import { generateId } from '../lib/id';
  import CollapsiblePanel from '../lib/CollapsiblePanel.svelte';
  import PageHeader from '../lib/PageHeader.svelte';
  import UniverseList from '../lib/lists/UniverseList.svelte';
  import EventList from '../lib/lists/EventList.svelte';
  import ObserverList from '../lib/lists/ObserverList.svelte';
  import type { StoryUniverse, StoryEvent, StoryObserver } from '../lib/types';

  // Seed data only — nothing here persists (spec §11 Phase 1, entry masks
  // before the storage layer). Small closed-loop example: Voss lives it
  // forward, the Handler lives the same stretch inverted, and they meet
  // at the handoff — plus one multi-event moment (the Handler witnesses
  // the handoff and the depot fire together, as a single simultaneous
  // moment) to demonstrate that a Moment isn't always exactly one event.
  // Voss also has a second, unmerged sequence — a moment recorded from a
  // separate account before it was clear where it falls relative to their
  // other moments (spec §2/§3) — to demonstrate multi-sequence observers.
  const primeId = generateId();

  let universes = $state<StoryUniverse[]>([{ id: primeId, label: 'Prime' }]);

  const e1 = generateId();
  const e2 = generateId();
  const e3 = generateId();

  let events = $state<StoryEvent[]>([
    { id: e1, label: 'Signal received at the depot', predecessors: [], universe: primeId },
    { id: e2, label: 'Handoff at the overpass', predecessors: [e1], universe: primeId },
    { id: e3, label: 'Depot burns', predecessors: [e2], universe: primeId },
  ]);

  let observers = $state<StoryObserver[]>([
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
  ]);
</script>

<div class="editor">
  <PageHeader tag="EDITOR &middot; ENTRY MASKS &middot; NOT PERSISTED" />

  <main class="layout">
    <CollapsiblePanel title="Events" count={events.length}>
      <EventList bind:events {universes} />
    </CollapsiblePanel>

    <div class="col-side">
      <CollapsiblePanel title="Universes" count={universes.length}>
        <UniverseList bind:universes {events} />
      </CollapsiblePanel>

      <CollapsiblePanel title="Observers" count={observers.length}>
        <ObserverList bind:observers {events} />
      </CollapsiblePanel>
    </div>
  </main>
</div>

<style>
  .editor {
    width: 100%;
    min-height: 100svh;
    display: flex;
    flex-direction: column;
  }

  .layout {
    flex: 1;
    padding: clamp(1rem, 3vw, 3rem);
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    gap: clamp(1.25rem, 2.5vw, 2rem);
    /* Grid stretches row items to the tallest cell by default, which would
       force the right column to match the (usually taller) Events column
       regardless of its own content — defeating the "collapse a panel to
       make room for the other" behavior entirely. This makes each column
       size to its own content instead. */
    align-items: start;
    /* .layout is flex:1 inside .editor's min-height:100svh column, so it's
       often taller than its own (auto-sized) content — e.g. with every
       panel collapsed. Grid's default align-content (normal, ~= stretch
       here) would distribute that leftover height across the auto row
       tracks, growing gaps between rows even though align-items above
       already pins each *item* to its track's top — invisible with one
       row (two-column layout: the slack just sits below the content), but
       very visible once panels stack into separate rows on narrow
       viewports. Pinning content-sized rows to the top keeps any leftover
       space below everything instead of wedged between panels. */
    align-content: start;
  }

  .col-side {
    display: flex;
    flex-direction: column;
    gap: inherit;
  }

  /* The right column (Universes/Observers) carries data-tables with a UUID
     column and multiple action buttons per row — content that doesn't
     compress much further before it clips (verified by survey: still
     clipping as late as ~1150px, clean by 1200px). Rather than chase the
     exact narrow pixel where it stops clipping — fragile, since real data
     (longer names, more visible UUIDs) shifts that threshold — the
     two-column layout is reserved for genuinely wide viewports; anything
     narrower stacks single-column, same as the phone-width case below. */
  @media (max-width: 1200px) {
    .layout {
      grid-template-columns: 1fr;
    }
  }
</style>
