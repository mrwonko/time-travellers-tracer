<script lang="ts">
  let { direction = $bindable('forward') }: { direction?: 'forward' | 'inverted' } = $props();
</script>

<div class="direction-toggle">
  <button type="button" class:active={direction === 'forward'} onclick={() => (direction = 'forward')}>
    FWD
  </button>
  <button type="button" class:active={direction === 'inverted'} onclick={() => (direction = 'inverted')}>
    INV
  </button>
</div>

<style>
  .direction-toggle {
    display: inline-flex;
    /* Fixed size regardless of context — without this, a flex/grid
       ancestor with default align-items/justify-items can stretch this
       to fill available width (e.g. a flex-column swatch section),
       leaving one button's box looking like it "extends to the right".
       center (not flex-start/start) — every real usage today
       (.add-moment, MomentBox's edit-mode .moment-body) already sets
       align-items: center on the parent for exactly this toggle's own
       sibling controls, so flex-start was fighting the parent's already-
       correct alignment rather than defending against a stretch that
       wasn't happening there. */
    align-self: center;
    justify-self: center;
    width: fit-content;
    border: var(--border-width) solid var(--color-border-strong);
  }

  .direction-toggle button {
    background: none;
    border: none;
    color: inherit;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    padding: 0.4rem 0.6rem;
    min-width: 3rem;
    cursor: pointer;
    opacity: 0.55;
  }

  .direction-toggle button.active {
    opacity: 1;
    color: var(--color-ink);
  }

  .direction-toggle button:first-child.active {
    background: var(--color-accent);
  }

  .direction-toggle button:last-child.active {
    background: var(--color-accent-secondary);
  }

  .direction-toggle button:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }
</style>
