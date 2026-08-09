<script lang="ts">
  let { direction }: { direction: 'forward' | 'inverted' } = $props();
</script>

<span class="direction-badge mono" class:inverted={direction === 'inverted'}>
  {direction === 'forward' ? 'FWD' : 'INV'}
</span>

<style>
  .direction-badge {
    display: inline-block;
    padding: 0.3rem 0.5rem;
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    background: var(--color-accent);
    color: var(--color-ink);
  }

  .direction-badge.inverted {
    background: var(--color-accent-secondary);
  }
</style>
