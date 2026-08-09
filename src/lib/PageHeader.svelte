<script lang="ts">
  import type { Snippet } from 'svelte';
  import ChamferBox from './ChamferBox.svelte';

  // Landing's page container already carries its own horizontal padding
  // (it's a constrained-width centered layout); Editor/ComponentLibrary
  // are full-width and need the bar to supply its own. Everything else
  // about the header is identical across all three pages.
  let {
    tag,
    paddingX = 'clamp(1rem, 3vw, 3rem)',
    children,
  }: { tag: string; paddingX?: string; children?: Snippet } = $props();
</script>

<header class="bar" style="--page-header-px: {paddingX}">
  <div class="wordmark">
    <ChamferBox tag="span" size="sm" bordered={false} class="page-header-mark" aria-hidden="true" />
    <span class="wordmark-text">TIME TRAVELLER'S TRACER</span>
  </div>
  <div class="header-actions">
    <span class="tag mono">{tag}</span>
    {#if children}
      {@render children()}
    {/if}
  </div>
</header>

<style>
  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem var(--page-header-px);
    border-bottom: var(--border-width) solid var(--color-border);
    flex-wrap: wrap;
  }

  .wordmark {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  /* :global() because the class is passed through to ChamferBox's own
     rendered element — genuinely global (not Svelte-scoped), hence the
     "page-header-" prefix to avoid an un-checked clash with an unrelated
     global class elsewhere. */
  :global(.page-header-mark) {
    width: 1.1rem;
    height: 1.1rem;
    background: var(--color-accent);
    flex: none;
  }

  .wordmark-text {
    font-weight: 600;
    letter-spacing: 0.04em;
    font-size: 0.95rem;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .tag {
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    opacity: 0.6;
  }
</style>
