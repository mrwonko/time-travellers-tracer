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
  // - Click-completion feedback still needs to fire only after a real
  //   click, since :active alone doesn't tell you whether the press
  //   actually ended in a click vs. a drag-off. A color pulse on just the
  //   icon glyph was tried first and judged too subtle; it's a full-
  //   background flash now (icon-btn-bg-flash below), closer in kind to
  //   the hover state's opacity shift but as a brief pulse rather than a
  //   steady change, so it reads at a glance the way hover does. Re-
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
  <span class="icon-btn-icon">
    <Icon name={icon} size={size === 'sm' ? 14 : 16} />
  </span>
  {#key flashKey}
    <span class="icon-btn-bg-flash" aria-hidden="true"></span>
  {/key}
</button>

<style>
  .icon-btn {
    position: relative;
    overflow: hidden;
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

  .icon-btn-icon {
    display: inline-flex;
    position: relative;
    z-index: 1;
  }

  /* Press feedback: scales only the icon, never the button box (see the
     comment above flashKey in the script for why). */
  .icon-btn:active .icon-btn-icon {
    transform: scale(0.85);
  }

  /* Click-completion feedback: a brief background flash across the whole
     button, fading out — same idea as the hover state's opacity shift
     (a highlight), but pushed one step further and as a pulse instead of
     a steady state, covering the full button rather than just the icon
     glyph so it reads clearly at a glance. Sits below the icon (z-index
     above, on .icon-btn-icon) so the glyph stays crisp on top of it.
     Color is variant-specific (below) rather than one fixed accent color
     for every button — an unrelated hue (cyan was tried first) read as
     jarring against the button's own resting color; a shade adjacent to
     it reads as "this button, but a beat more" instead. */
  .icon-btn-bg-flash {
    position: absolute;
    inset: 0;
    /* Resting state matches the keyframe's `to` value — without this,
       the element's opacity after the animation ends falls back to the
       default (1, fully opaque) rather than holding at 0, since plain
       `animation` (no explicit fill-mode) doesn't persist the end
       keyframe. Without it, every button ends up permanently tinted
       the moment its one-shot animation finishes. */
    opacity: 0;
    animation: icon-btn-click-pulse 200ms var(--ease-standard);
    pointer-events: none;
  }

  /* default/accent rest on the bright amber accent — the flash goes to
     amber-ink, the same hue's darker/richer "ink" counterpart already
     used elsewhere for on-accent text, rather than a lighter tint (which
     would wash out against the accent instead of reading as emphasis). */
  .icon-btn-default .icon-btn-bg-flash,
  .icon-btn-accent .icon-btn-bg-flash {
    background: var(--color-accent-ink);
  }

  /* ghost rests dimmed (opacity: 0.55) in --color-fg with no background
     of its own — flashing that same color at full strength as a
     background is the equivalent move: the button's own resting color,
     taken one step further. */
  .icon-btn-ghost .icon-btn-bg-flash {
    background: var(--color-fg);
  }

  @keyframes icon-btn-click-pulse {
    from {
      opacity: 0.7;
    }
    to {
      opacity: 0;
    }
  }
</style>
