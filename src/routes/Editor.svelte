<script lang="ts">
  import { replace } from 'svelte-spa-router';
  import CollapsiblePanel from '../lib/CollapsiblePanel.svelte';
  import PageHeader from '../lib/PageHeader.svelte';
  import StoryToolbar from '../lib/StoryToolbar.svelte';
  import StoryPicker from '../lib/StoryPicker.svelte';
  import UniverseList from '../lib/lists/UniverseList.svelte';
  import EventList from '../lib/lists/EventList.svelte';
  import ObserverList from '../lib/lists/ObserverList.svelte';
  import { story, registry, activeStoryId, switchToStory } from '../lib/story.svelte';

  // Both '/editor' and '/editor/:id' route here (see App.svelte) — params.id
  // is only present for the latter.
  let { params = {} }: { params?: { id?: string } } = $props();

  // '/editor' (no id): resolve to the currently-active story's own URL
  // instead of rendering here directly, so the URL always carries the
  // story id (spec's "current story id tracked via the URL"). Once params.id
  // is present, switch the store to match it whenever it changes (covers
  // both the initial load and switching via StoryPicker's navigation).
  $effect(() => {
    const id = params.id;
    if (!id) {
      replace(`/editor/${activeStoryId.value}`);
      return;
    }
    switchToStory(id);
  });

  let activeStoryName = $derived(registry.find((s) => s.id === activeStoryId.value)?.name ?? '');
</script>

<div class="editor">
  <PageHeader tag={`EDITOR · ${activeStoryName}`}>
    <StoryPicker />
    <StoryToolbar />
  </PageHeader>

  <main class="layout">
    <CollapsiblePanel title="Events" count={story.events.length}>
      <EventList bind:events={story.events} universes={story.universes} />
    </CollapsiblePanel>

    <div class="col-side">
      <CollapsiblePanel title="Universes" count={story.universes.length}>
        <UniverseList bind:universes={story.universes} events={story.events} />
      </CollapsiblePanel>

      <CollapsiblePanel title="Observers" count={story.observers.length}>
        <ObserverList bind:observers={story.observers} events={story.events} />
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
