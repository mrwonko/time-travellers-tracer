<script lang="ts">
  import Icon, { type IconName } from './Icon.svelte';

  let {
    icon,
    label,
    onclick,
    variant = 'default',
    size = 'md',
    disabled = false,
    type = 'button',
  }: {
    icon: IconName;
    label: string;
    onclick?: (e: MouseEvent) => void;
    variant?: 'default' | 'accent' | 'ghost';
    size?: 'sm' | 'md';
    disabled?: boolean;
    type?: 'button' | 'submit';
  } = $props();
</script>

<button
  {type}
  class="icon-btn icon-btn-{variant} icon-btn-{size}"
  aria-label={label}
  title={label}
  {disabled}
  {onclick}
>
  <Icon name={icon} size={size === 'sm' ? 14 : 16} />
</button>

<style>
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.75rem;
    min-height: 2.75rem;
    background: var(--color-accent);
    border: var(--border-width) solid var(--color-accent);
    color: var(--color-ink);
    cursor: pointer;
    transition: opacity var(--duration-fast) var(--ease-standard);
  }

  .icon-btn-sm {
    min-width: 2.25rem;
    min-height: 2.25rem;
  }

  .icon-btn-default:hover,
  .icon-btn-default:focus-visible,
  .icon-btn-accent:hover,
  .icon-btn-accent:focus-visible {
    opacity: 0.8;
  }

  .icon-btn-ghost {
    background: none;
    border-color: transparent;
    color: var(--color-fg);
    opacity: 0.55;
  }

  .icon-btn-ghost:hover,
  .icon-btn-ghost:focus-visible {
    opacity: 1;
  }

  .icon-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .icon-btn:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
</style>
