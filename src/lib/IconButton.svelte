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

  // Two separate feedback mechanisms, deliberately not the same one:
  // - Press feedback (`:active`, pure CSS below) scales only the icon
  //   glyph inside the button, not the button itself — the button's own
  //   box (and therefore its hit-test area) never changes size, so a
  //   press that starts near the edge and drags off before release can't
  //   lose the element under the pointer. Scaling the *button* was tried
  //   first and rejected for exactly that reason.
  // - Click-completion feedback (the color pulse below) still needs to
  //   fire only after a real click, since :active alone doesn't tell you
  //   whether the press actually ended in a click vs. a drag-off. Re-
  //   keying this span on every click restarts its CSS animation from
  //   scratch, purely as a retroactive acknowledgment.
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
    animation: icon-btn-click-pulse 200ms var(--ease-standard);
  }

  /* Press feedback: scales only the icon, never the button box (see the
     comment above flashKey in the script for why). */
  .icon-btn:active .icon-btn-flash {
    transform: scale(0.85);
  }

  /* Click-completion feedback: a brief color pulse to the secondary
     (cyan) accent, distinct from both variants' resting colors (ink on
     amber for default/accent, dimmed fg for ghost), then back. */
  @keyframes icon-btn-click-pulse {
    from {
      color: var(--color-accent-secondary-ink);
    }
    to {
      color: inherit;
    }
  }
</style>
