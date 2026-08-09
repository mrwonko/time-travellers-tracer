<script lang="ts">
  import { generateId } from './id';
  import ChamferBox from './ChamferBox.svelte';

  let {
    options,
    selected = $bindable([]),
    placeholder = 'Select…',
  }: {
    options: { id: string; label: string }[];
    selected?: string[];
    placeholder?: string;
  } = $props();

  // Unique per instance — anchor-name/position-anchor is a 1:1 CSS link,
  // and a page can have several of these open at once (e.g. one editing
  // row, one add-row).
  const uid = generateId();
  const popoverId = `combobox-${uid}`;
  const anchorName = `--combobox-${uid}`;

  let open = $state(false);
  let filter = $state('');
  let filterInput: HTMLInputElement | undefined = $state();
  let triggerEl: HTMLButtonElement | undefined = $state();

  let filtered = $derived(
    options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase())),
  );

  // The native `popover` attribute (not a hand-rolled open/close + portal)
  // handles: rendering in the top layer, so clip-path on the chamfered
  // panel ancestors can't clip it (unlike a plain position:fixed
  // descendant); light-dismiss on outside click/tap; and Escape-to-close.
  // None of that is reimplemented here anymore.
  //
  // This element (the `[popover]` host) is deliberately *not* where the
  // chamfer/border classes live — they used to be applied directly here,
  // which silently clobbered the popover's native `position: fixed` with
  // `position: relative` (author CSS always wins over the UA stylesheet,
  // regardless of specificity), which in turn made the position-anchor
  // setup below completely inert. The host now owns positioning only;
  // <ChamferBox> nested inside owns the border/chamfer chrome, on its own
  // DOM layer, so the two concerns can't collide again.
  //
  // FIXME: light-dismiss during a drag is inconsistent. A drag that
  // starts on (or crosses over) the popover and ends outside it does NOT
  // close it — confirmed with real mouse and touch dispatch. But a drag
  // that starts and ends entirely outside the popover, never touching it,
  // still closes it. Only the former was re-verified after switching to
  // the native popover; the latter is the actual real-world gesture (e.g.
  // dragging the page to scroll it into view) and needs its own fix —
  // deliberately not chasing that further right now.
  // Scrolls the trigger away from the viewport's bottom edge before the
  // popover (which always opens below it, see the TODO in the style
  // block) renders, so there's room for it instead of it extending past
  // the bottom of the visible page. `scroll-margin-bottom` on the trigger
  // (below) tells scrollIntoView how much clearance to leave; the page
  // itself also needs enough scrollable height below the trigger for
  // there to be anywhere left to scroll *to* — see the padding-bottom
  // note on ComponentLibrary's <main>, which is deliberately generous for
  // this reason.
  function handleToggle(event: ToggleEvent) {
    open = event.newState === 'open';
    if (open) {
      filter = '';
      filterInput?.focus();
      triggerEl?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }
</script>

<button
  bind:this={triggerEl}
  popovertarget={popoverId}
  type="button"
  class="field combobox-trigger"
  style="anchor-name: {anchorName}"
  aria-expanded={open}
>
  {#if selected.length === 0}
    <span class="placeholder">{placeholder}</span>
  {:else}
    <span class="mono">{selected.length} selected</span>
  {/if}
</button>

<div
  id={popoverId}
  popover="auto"
  class="combobox-popover-host"
  style="position-anchor: {anchorName}"
  ontoggle={handleToggle}
>
  <ChamferBox size="sm" class="combobox-chamfer">
    <div class="combobox-inner">
      <input
        bind:this={filterInput}
        type="text"
        class="field"
        placeholder="Filter…"
        bind:value={filter}
      />
      <ul class="combobox-options">
        {#each filtered as option (option.id)}
          <li>
            <label>
              <input type="checkbox" bind:group={selected} value={option.id} />
              {option.label}
            </label>
          </li>
        {:else}
          <li class="empty muted">No matches</li>
        {/each}
      </ul>
    </div>
  </ChamferBox>
</div>

<style>
  .combobox-trigger {
    text-align: left;
    cursor: pointer;
    /* How much clearance scrollIntoView (see handleToggle) leaves below
       the trigger — matches the popover's own max-height cap below plus
       a small gap, so scrolling stops with just enough room for the
       popover to render without being clipped by the viewport edge. */
    scroll-margin-bottom: calc(20rem + 1rem);
  }

  .placeholder {
    opacity: 0.5;
  }

  .combobox-popover-host {
    /* TODO: flips above the trigger when there isn't room below is
       postponed, and no longer the plan for the "extends past the
       viewport" problem specifically — that's now handled by scrolling
       the trigger into view with clearance before opening (see
       handleToggle + .combobox-trigger's scroll-margin-bottom) rather
       than by flipping the popover to the other side. CSS `position-try:
       flip-block` (paired with anchor-name/position-anchor above) is
       still the native way to do an actual flip if one is wanted later
       for its own sake, but didn't trigger reliably in testing (Chrome
       151) even with the anchor pushed into a viewport far too small to
       fit below — either an implementation gap in this exact form, or a
       syntax issue not found yet, re-tested after the position:fixed fix
       above (see ChamferBox split note) in case that was the actual
       blocker, still no luck. For now this always opens below the
       trigger, capped to a fixed max-height with internal scroll if the
       option list is long. */
    position-area: bottom span-right;
    margin: 0;
    /* The browser gives top-layer popovers a default focus outline on
       open; we already have the chamfered border for definition, and the
       filter input shows its own focus ring, so this is just noise. */
    outline: none;
    z-index: var(--z-popover);
    max-width: min(24rem, 90vw);
    min-width: anchor-size(width);
    width: max-content;
    max-height: min(60vh, 20rem);
  }

  /* The UA stylesheet hides closed popovers via `display: none`. Setting
     `display: flex` unconditionally above would override that default
     and leave it permanently visible — scoping it to :popover-open is
     what actually keeps it hidden until shown. flex-direction: column so
     the nested ChamferBox can flex/shrink to the max-height cap instead
     of overflowing it. */
  .combobox-popover-host:popover-open {
    display: flex;
    flex-direction: column;
  }

  /* :global() because the class is passed through to ChamferBox's own
     rendered element, not applied to an element literally present in
     this component's template. min-height: 0 lets it shrink below its
     content's intrinsic height inside the flex host, which is what
     makes the inner overflow-y: auto actually kick in at max-height
     instead of the host just growing past it. */
  :global(.combobox-chamfer) {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .combobox-inner {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.6rem;
    overflow-y: auto;
    min-height: 0;
  }

  .combobox-options {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 12rem;
    overflow-y: auto;
    border-top: var(--border-width) solid var(--color-border);
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .combobox-options li {
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .combobox-options li:last-child {
    border-bottom: none;
  }

  .combobox-options label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.3rem;
    cursor: pointer;
    min-height: 2.25rem;
  }

  .combobox-options .empty {
    padding: 0.5rem 0.3rem;
    cursor: default;
  }
</style>
