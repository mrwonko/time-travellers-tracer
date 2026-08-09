<script lang="ts">
  let { id, initialRevealed = false }: { id: string; initialRevealed?: boolean } = $props();
  // Deliberately just a one-time initial value, like useState's initializer
  // — later changes to the prop shouldn't reset user interaction.
  // svelte-ignore state_referenced_locally
  let revealed = $state(initialRevealed);
</script>

<span class="uuid">
  <button
    type="button"
    class="uuid-toggle mono"
    onclick={() => (revealed = !revealed)}
    aria-expanded={revealed}
    aria-label={revealed ? 'Hide ID' : 'Show ID'}
  >
    ID
  </button>
  <code class="uuid-value mono" class:revealed>{id}</code>
</span>

<style>
  .uuid {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    vertical-align: middle;
  }

  .uuid-toggle {
    background: none;
    border: var(--border-width) solid var(--color-border-strong);
    color: var(--color-fg);
    opacity: 0.55;
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    line-height: 1;
    padding: 0.2rem 0.35rem;
    cursor: pointer;
    transition: opacity var(--duration-fast) var(--ease-standard);
  }

  .uuid-toggle:hover,
  .uuid-toggle:focus-visible {
    opacity: 1;
  }

  .uuid-value {
    display: none;
    font-size: 0.72rem;
    opacity: 0.5;
  }

  .uuid-value.revealed {
    display: inline;
  }

  /* Large screens: always show the ID, hide the toggle — it's noise on a
     phone, but reads as "technical instrument" on a bigger surface. */
  @media (min-width: 860px) {
    .uuid-toggle {
      display: none;
    }

    .uuid-value {
      display: inline;
    }
  }
</style>
