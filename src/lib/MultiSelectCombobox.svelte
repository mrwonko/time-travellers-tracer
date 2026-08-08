<script lang="ts">
  import { portal } from './actions';
  import IconButton from './IconButton.svelte';

  let {
    options,
    selected = $bindable([]),
    placeholder = 'Select…',
  }: {
    options: { id: string; label: string }[];
    selected?: string[];
    placeholder?: string;
  } = $props();

  let open = $state(false);
  let filter = $state('');
  let filterInput: HTMLInputElement | undefined = $state();
  let triggerEl: HTMLButtonElement | undefined = $state();
  let popoverEl: HTMLDivElement | undefined = $state();
  let popoverStyle = $state('');

  let filtered = $derived(
    options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase())),
  );

  // The popover is portaled to <body> (see actions.ts) because chamfered
  // panels use `clip-path` for their cut corners, and clip-path clips its
  // entire painted subtree — including position:absolute descendants,
  // which can normally escape a plain `overflow: hidden` ancestor but
  // cannot escape clip-path. Portaling means we position it with JS
  // instead of CSS.
  function updatePosition() {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    // Prefer the visual viewport when available — on mobile, opening the
    // on-screen keyboard shrinks it without necessarily changing
    // window.innerHeight, and this is what actually needs to fit the
    // popover so the keyboard doesn't just cover it.
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    // Clamped to 0 — if the trigger itself has scrolled out of view (e.g.
    // a very aggressive viewport shrink), treat "space" as none rather
    // than negative, which would otherwise push the popover off-screen
    // through the anchor math below instead of just picking a side.
    const spaceBelow = Math.max(0, viewportHeight - rect.bottom);
    const spaceAbove = Math.max(0, rect.top);
    const margin = 8;
    // Flip upward if there's not much room below and more room above —
    // otherwise, with position:fixed, the popover can render past the
    // viewport bottom with no way to scroll to it (fixed elements don't
    // move with page scroll).
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
    if (openUpward) {
      // Clamp so the anchor itself can't go negative (which would push
      // the popover below the viewport instead of above the trigger) —
      // worst case it sits flush against the viewport bottom with a
      // reduced max-height, scrollable internally, rather than off-screen.
      const bottomOffset = Math.max(margin, viewportHeight - rect.top + 4);
      const maxHeight = Math.max(80, spaceAbove - margin);
      popoverStyle = `bottom: ${bottomOffset}px; left: ${rect.left}px; min-width: ${rect.width}px; max-height: ${maxHeight}px;`;
    } else {
      const topOffset = Math.min(viewportHeight - margin, rect.bottom + 4);
      const maxHeight = Math.max(80, spaceBelow - margin);
      popoverStyle = `top: ${topOffset}px; left: ${rect.left}px; min-width: ${rect.width}px; max-height: ${maxHeight}px;`;
    }
  }

  $effect(() => {
    if (open && triggerEl) {
      updatePosition();
      filterInput?.focus();

      // Re-run on viewport changes while open — most importantly, the
      // on-screen keyboard opening/closing on mobile. Listen on both
      // window and visualViewport (when available) rather than picking
      // one — which of the two actually fires for a given size change
      // varies by browser/environment, and this is cheap to double up.
      const viewport = window.visualViewport;
      window.addEventListener('resize', updatePosition);
      viewport?.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('resize', updatePosition);
        viewport?.removeEventListener('resize', updatePosition);
      };
    }
  });

  $effect(() => {
    if (!open) return;

    // Tried plain `click` here first — browsers only suppress it after
    // real movement for *touch* input (that's the separate tap-vs-scroll
    // gesture recognition touch gets); for *mouse*, `click` fires however
    // far you dragged between press and release, confirmed by testing a
    // mouse drag-select across the page while this was open — it closed
    // the popover anyway. Pointer Events cover mouse+touch+pen uniformly,
    // so checking movement ourselves is the one approach that's correct
    // for both, not just touch.
    let downPos: { x: number; y: number } | null = null;
    const TAP_TOLERANCE = 8; // px of press-release movement still counted as a tap

    function handlePointerDown(event: PointerEvent) {
      downPos = { x: event.clientX, y: event.clientY };
    }

    function handlePointerUp(event: PointerEvent) {
      if (!downPos) return;
      const { x, y } = downPos;
      downPos = null;
      if (Math.abs(event.clientX - x) > TAP_TOLERANCE || Math.abs(event.clientY - y) > TAP_TOLERANCE) {
        return; // was a drag/scroll, not a tap
      }
      const target = event.target;
      if (target instanceof Node && !triggerEl?.contains(target) && !popoverEl?.contains(target)) {
        close();
      }
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    document.addEventListener('keydown', handleKeydown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
      document.removeEventListener('keydown', handleKeydown, true);
    };
  });

  function close() {
    open = false;
    filter = '';
  }
</script>

<div class="combobox">
  <button
    bind:this={triggerEl}
    type="button"
    class="field combobox-trigger"
    onclick={() => (open = !open)}
    aria-expanded={open}
  >
    {#if selected.length === 0}
      <span class="placeholder">{placeholder}</span>
    {:else}
      <span class="mono">{selected.length} selected</span>
    {/if}
  </button>

  {#if open}
    <div
      bind:this={popoverEl}
      class="combobox-popover chamfer-sm-bordered"
      style={popoverStyle}
      use:portal
    >
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
      <div class="combobox-footer">
        <IconButton icon="save" label="Done" variant="accent" size="sm" onclick={close} />
      </div>
    </div>
  {/if}
</div>

<style>
  .combobox {
    position: relative;
  }

  .combobox-trigger {
    text-align: left;
    cursor: pointer;
  }

  .placeholder {
    opacity: 0.5;
  }

  .combobox-popover {
    position: fixed;
    z-index: var(--z-popover);
    max-width: min(24rem, 90vw);
    width: max-content;
    padding: 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
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

  .combobox-footer {
    display: flex;
    justify-content: flex-end;
  }
</style>
