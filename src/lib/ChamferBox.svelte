<script module lang="ts">
  // Exported for the one legitimate case that can't go through the
  // component itself: <summary> must be a *direct* child of <details> to
  // be recognized as its native disclosure label (nesting it inside a
  // wrapper div — even this component — makes the browser ignore it and
  // fall back to a generic "Details" label instead). CollapsiblePanel
  // applies these classes straight to a literal <details> for that
  // reason, but still goes through this one function so the size/bordered
  // → classname mapping isn't reimplemented a second place.
  export function chamferClass(size: 'sm' | 'md' = 'md', bordered = true): string {
    return bordered ? (size === 'sm' ? 'chamfer-sm-bordered' : 'chamfer-bordered') : size === 'sm' ? 'chamfer-sm' : 'chamfer';
  }
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';

  // The one place in the codebase that decides which chamfer classes mean
  // what — every other component wraps its content in this instead of
  // applying `.chamfer(-sm)(-bordered)` directly, so the border trick's
  // required pairing (position/isolation on the bordered variants, see
  // the <style> block below) can't be forgotten or clobbered by a
  // consumer's own styles the way it was on MultiSelectCombobox's popover.
  let {
    tag = 'div',
    size = 'md',
    bordered = true,
    class: className = '',
    children,
    ...rest
  }: {
    tag?: 'div' | 'span' | 'a' | 'button' | 'section' | 'article';
    size?: 'sm' | 'md';
    bordered?: boolean;
    class?: string;
    children?: Snippet;
    [key: string]: unknown;
  } = $props();

  let resolvedClass = $derived(chamferClass(size, bordered));
</script>

<svelte:element this={tag} class="{className} {resolvedClass}" {...rest}>
  {#if children}
    {@render children()}
  {/if}
</svelte:element>

<style>
  /* Global, not scoped to this component's own rendered element: these
     classes also get applied directly to CollapsiblePanel's literal
     <details> (via the exported chamferClass() above, see its comment)
     since that element can't be routed through <ChamferBox> itself.
     Colocating the rules here — rather than in app.css — keeps the
     "what does size/bordered map to" (chamferClass) and "what does that
     class actually look like" (these rules) next to each other. */
  :global(.chamfer) {
    clip-path: polygon(
      var(--chamfer) 0%,
      100% 0%,
      100% calc(100% - var(--chamfer)),
      calc(100% - var(--chamfer)) 100%,
      0% 100%,
      0% var(--chamfer)
    );
  }

  :global(.chamfer-sm) {
    clip-path: polygon(
      var(--chamfer-sm) 0%,
      100% 0%,
      100% calc(100% - var(--chamfer-sm)),
      calc(100% - var(--chamfer-sm)) 100%,
      0% 100%,
      0% var(--chamfer-sm)
    );
  }

  /*
   * Bordered variants: clip-path clips a box's `border` along with
   * everything else, so a chamfered corner with a plain `border` has no
   * outline on the diagonal cut — only on the untouched straight edges.
   * These build the border from two stacked, independently-clipped layers
   * instead: an outer "frame" (background = border color) and an inset
   * "fill" (::before, offset by --border-width), so the outline is
   * continuous all the way around, diagonals included.
   */
  :global(.chamfer-bordered),
  :global(.chamfer-sm-bordered) {
    position: relative;
    isolation: isolate;
    background: var(--color-border);
  }

  :global(.chamfer-bordered) {
    clip-path: polygon(
      var(--chamfer) 0%,
      100% 0%,
      100% calc(100% - var(--chamfer)),
      calc(100% - var(--chamfer)) 100%,
      0% 100%,
      0% var(--chamfer)
    );
  }

  :global(.chamfer-sm-bordered) {
    clip-path: polygon(
      var(--chamfer-sm) 0%,
      100% 0%,
      100% calc(100% - var(--chamfer-sm)),
      calc(100% - var(--chamfer-sm)) 100%,
      0% 100%,
      0% var(--chamfer-sm)
    );
  }

  :global(.chamfer-bordered)::before,
  :global(.chamfer-sm-bordered)::before {
    content: '';
    position: absolute;
    inset: var(--border-width);
    z-index: -1;
    background: var(--chamfer-fill, var(--color-panel-bg));
  }

  :global(.chamfer-bordered)::before {
    clip-path: polygon(
      var(--chamfer) 0%,
      100% 0%,
      100% calc(100% - var(--chamfer)),
      calc(100% - var(--chamfer)) 100%,
      0% 100%,
      0% var(--chamfer)
    );
  }

  :global(.chamfer-sm-bordered)::before {
    clip-path: polygon(
      var(--chamfer-sm) 0%,
      100% 0%,
      100% calc(100% - var(--chamfer-sm)),
      calc(100% - var(--chamfer-sm)) 100%,
      0% 100%,
      0% var(--chamfer-sm)
    );
  }
</style>
