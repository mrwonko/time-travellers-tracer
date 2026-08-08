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
  // app.css) can't be forgotten or clobbered by a consumer's own styles
  // the way it was on MultiSelectCombobox's popover.
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
