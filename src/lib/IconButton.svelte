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

  // Feedback is triggered by a *completed* click, never by :active/press
  // state. A press-driven `transform: scale()` is actively risky here:
  // it shrinks the hit-test box from the moment the pointer goes down, so
  // a press that starts near the button's edge and drags off before
  // release can lose the element under the pointer entirely — exactly
  // the drag-off-then-release-outside sequence that would otherwise still
  // fire a click. Re-keying this span on every real click instead
  // restarts its CSS animation from scratch, purely as a retroactive
  // acknowledgment after the click has already fired.
  let flashKey = $state(0);
  function handleClick(e: MouseEvent) {
    onclick?.(e);
    flashKey++;
  }
</script>

<button
  {type}
  class="icon-btn icon-btn-{variant} icon-btn-{size}"
  aria-label={label}
  title={label}
  {disabled}
  onclick={handleClick}
>
  {#key flashKey}
    <span class="icon-btn-flash">
      <Icon name={icon} size={size === 'sm' ? 14 : 16} />
    </span>
  {/key}
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

  .icon-btn-flash {
    display: inline-flex;
    animation: icon-btn-press 150ms var(--ease-standard);
  }

  @keyframes icon-btn-press {
    from {
      transform: scale(0.85);
    }
    to {
      transform: scale(1);
    }
  }
</style>
