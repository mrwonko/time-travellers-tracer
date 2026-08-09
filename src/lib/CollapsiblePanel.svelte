<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';
  import { chamferClass } from './ChamferBox.svelte';
  import { autoScrollContainer } from './dnd/actions';

  let {
    title,
    titleSnippet,
    count,
    open = $bindable(true),
    actions,
    children,
    capHeight = false,
  }: {
    title?: string;
    titleSnippet?: Snippet;
    count?: number;
    open?: boolean;
    actions?: Snippet;
    children: Snippet;
    capHeight?: boolean;
  } = $props();
</script>

<!-- <summary> must be a *direct* child of <details> to be recognized as
     its native disclosure label — nesting it inside a wrapper component
     (even ChamferBox) makes the browser ignore it and fall back to a
     generic "Details" label instead. So the chamfer/border classes are
     applied straight to this literal <details>, via ChamferBox's own
     exported `chamferClass()` helper rather than a second copy of the
     size/bordered → classname mapping. -->
<details bind:open class="panel {chamferClass()}" class:cap-height={capHeight}>
  <summary class="panel-summary">
    <span class="chevron">
      <Icon name="chevron" size={12} />
    </span>
    {#if titleSnippet}
      {@render titleSnippet()}
    {:else}
      <h2>{title}</h2>
    {/if}
    {#if count !== undefined}
      <span class="count mono">{count}</span>
    {/if}
    {#if actions}
      <!-- Interactive controls inside <summary> would otherwise also
           trigger the native disclosure toggle on click — stopping
           propagation here is the standard way to let them handle their
           own clicks without collapsing/expanding the panel. Not itself
           an interactive element (the real controls are the rendered
           `actions` children, which carry their own keyboard handling),
           so the a11y click/keyboard-pairing rules don't apply here.

           Verified (both a real click in a real browser, and a
           component-level browser test) that this only reliably
           suppresses the toggle when `actions` renders real interactive
           content — a <button>, e.g. IconButton, the only thing every
           current caller passes. A plain non-interactive element with
           just a click handler was NOT enough to stop the toggle in
           testing — `actions` must render focusable controls, not bare
           text/spans. -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <span class="panel-actions" onclick={(e) => e.stopPropagation()}>
        {@render actions()}
      </span>
    {/if}
  </summary>
  <div class="panel-body" use:autoScrollContainer={capHeight}>
    {@render children()}
  </div>
</details>

<style>
  .panel {
    /* Exposed as a custom property (inherited by anything nested inside,
       across component boundaries — Svelte doesn't scope custom property
       *values*, just selectors) so descendants can bleed edge-to-edge by
       negating it, rather than duplicating this clamp() as a guessed fixed
       value that would drift out of sync with it at other viewport
       widths. See ObserverCard's .sequences for the consumer. */
    --panel-padding: clamp(1rem, 2vw, 1.5rem);
    padding: var(--panel-padding);
  }

  .panel-summary {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    cursor: pointer;
    list-style: none;
  }

  .panel-summary::-webkit-details-marker {
    display: none;
  }

  .chevron {
    display: inline-flex;
    align-self: center;
    opacity: 0.5;
    transition: transform var(--duration-fast) var(--ease-standard);
  }

  details[open] .chevron {
    transform: rotate(90deg);
  }

  .panel-summary h2 {
    font-size: 1.1rem;
  }

  .count {
    font-size: 0.75rem;
    opacity: 0.5;
  }

  .panel-actions {
    display: flex;
    gap: 0.4rem;
    margin-left: auto;
  }

  .panel-body {
    margin-top: 1rem;
  }

  /* Opt-in: lets an outer layout clamp this panel and have the body scroll
     inside it instead of the page growing. min-height:0 is load-bearing —
     as a flex/grid item this panel's automatic minimum size is its
     min-content height, which would otherwise win over the caller's
     max-height. Off by default so nested panels (e.g. ObserverCard's own
     sequences panel) keep their natural, unbounded height. */
  .panel.cap-height {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  /* Chromium (and current Firefox/Safari) wrap non-summary <details>
     content in a ::details-content box, making .panel-body a grandchild
     that would never see the clamp above — the panel sizes correctly but
     its content silently overflows with no scrollbar. This hands scrolling
     back to .panel-body in every engine; where ::details-content doesn't
     exist, this rule is simply dropped and .panel-body already is the flex
     item. */
  .panel.cap-height::details-content {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .panel.cap-height > .panel-body {
    min-height: 0;
    overflow: auto;
  }
</style>
