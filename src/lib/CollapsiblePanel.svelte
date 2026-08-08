<script lang="ts">
  import type { Snippet } from 'svelte';
  import Icon from './Icon.svelte';

  let {
    title,
    count,
    collapsed = $bindable(false),
    children,
  }: {
    title: string;
    count?: number;
    collapsed?: boolean;
    children: Snippet;
  } = $props();
</script>

<section class="panel chamfer-bordered">
  <button
    type="button"
    class="panel-head"
    aria-expanded={!collapsed}
    onclick={() => (collapsed = !collapsed)}
  >
    <span class="chevron" class:open={!collapsed}>
      <Icon name="chevron" size={12} />
    </span>
    <h2>{title}</h2>
    {#if count !== undefined}
      <span class="count mono">{count}</span>
    {/if}
  </button>

  {#if !collapsed}
    <div class="panel-body">
      {@render children()}
    </div>
  {/if}
</section>

<style>
  .panel {
    padding: clamp(1rem, 2vw, 1.5rem);
  }

  .panel-head {
    width: 100%;
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    background: none;
    border: none;
    color: inherit;
    font-family: inherit;
    padding: 0;
    margin-bottom: 1rem;
    cursor: pointer;
    text-align: left;
  }

  .chevron {
    display: inline-flex;
    align-self: center;
    opacity: 0.5;
    transition: transform var(--duration-fast) var(--ease-standard);
  }

  .chevron.open {
    transform: rotate(90deg);
  }

  .panel-head h2 {
    font-size: 1.1rem;
  }

  .count {
    font-size: 0.75rem;
    opacity: 0.5;
  }
</style>
