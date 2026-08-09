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
  let dropUp = $state(false);
  let popoverMaxHeight = $state<number | undefined>(undefined);

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
  // Decides which side to open on and how tall the popover can be.
  // Ported from the JS-computed positioning this component used before
  // the native-popover rewrite (see git history at 15d7ac1^) — that
  // logic was already proven correct, including the visualViewport
  // preference for the mobile-keyboard case, so it's reused here instead
  // of re-deriving it. The native `popover` + CSS anchor positioning
  // still owns the actual left/top math; this only decides the
  // `position-area` side (via the `dropUp` class below) and caps
  // `max-height` to whichever side actually has room, rather than trying
  // to make the page grow to fit a fixed-size popover (tried in an
  // earlier pass — see PR review discussion — and rejected: it meant a
  // permanent, content-unrelated bottom margin on every page using this
  // component, for a page-growing effect that only mattered for one
  // trigger position anyway).
  function updatePosition() {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom);
    const spaceAbove = Math.max(0, rect.top);
    const margin = 8;
    dropUp = spaceBelow < 220 && spaceAbove > spaceBelow;
    popoverMaxHeight = Math.max(80, (dropUp ? spaceAbove : spaceBelow) - margin);
  }

  function handleToggle(event: ToggleEvent) {
    open = event.newState === 'open';
    if (open) {
      filter = '';
      filterInput?.focus();
      updatePosition();
    }
  }

  // Re-run while open on viewport changes — most importantly the
  // on-screen keyboard opening/closing on mobile, which can shrink the
  // visual viewport without changing window.innerHeight.
  $effect(() => {
    if (!open) return;
    const viewport = window.visualViewport;
    window.addEventListener('resize', updatePosition);
    viewport?.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      viewport?.removeEventListener('resize', updatePosition);
    };
  });
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
  class:combobox-popover-host-up={dropUp}
  style="position-anchor: {anchorName}; {popoverMaxHeight ? `max-height: ${popoverMaxHeight}px;` : ''}"
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
  }

  .placeholder {
    opacity: 0.5;
  }

  .combobox-popover-host {
    /* Default side; flipped to open above the trigger instead via the
       .combobox-popover-host-up class, set from JS (updatePosition in
       the script) rather than CSS `position-try: flip-block` — that's
       the native way to do this, paired with anchor-name/position-anchor
       above, but didn't trigger reliably in testing (Chrome 151) even
       with the anchor pushed into a viewport far too small to fit below,
       re-tested after the position:fixed fix above (see ChamferBox split
       note) in case that was the actual blocker, still no luck. `dropUp`
       also drives the max-height cap (inline style below) to whichever
       side actually has room, ported from this component's pre-native-
       popover implementation (see git history at 15d7ac1^), so this
       doesn't just flip blindly whenever there's *slightly* more room on
       the other side. */
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
    /* Fallback for the instant between mount and the first `updatePosition()`
       call (which sets the inline max-height that overrides this) — never
       actually visible, since the popover isn't shown until it opens. */
    max-height: min(60vh, 20rem);
  }

  .combobox-popover-host-up {
    position-area: top span-right;
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
