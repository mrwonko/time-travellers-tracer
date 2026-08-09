<script module lang="ts">
  export type IconName = 'plus' | 'edit' | 'x' | 'save' | 'chevron' | 'grip';

  // Square caps/miter joins (not round) to match the sharp-corner design
  // language — see design-language.md §Shape. 16x16 viewBox throughout.
  const PATHS: Record<IconName, string[]> = {
    plus: ['M8 3 L8 13', 'M3 8 L13 8'],
    edit: ['M11 2 L14 5 L6 13 L3 13 L3 10 Z'],
    // Delete and cancel share this glyph — both read as "remove," they
    // differ only in the aria-label of the button that uses them.
    x: ['M4 4 L12 12', 'M12 4 L4 12'],
    save: ['M3 8.5 L6.5 12 L13 4.5'],
    chevron: ['M6 3 L11 8 L6 13'],
    // A 2x3 grid of tiny square dots (short segments with a square
    // linecap render as dots) — the familiar drag-handle glyph, built
    // from the same straight-segment primitive as every other icon here
    // rather than reaching for a circle.
    grip: [
      'M5.5 3.3 L5.5 3.7',
      'M10.5 3.3 L10.5 3.7',
      'M5.5 7.8 L5.5 8.2',
      'M10.5 7.8 L10.5 8.2',
      'M5.5 12.3 L5.5 12.7',
      'M10.5 12.3 L10.5 12.7',
    ],
  };
</script>

<script lang="ts">
  // Default (no ariaLabel): purely decorative, aria-hidden — this is
  // correct whenever the icon sits inside an already-labeled control
  // (e.g. IconButton, which labels its own <button> and deliberately
  // does *not* pass ariaLabel down here — double-labeling both the
  // button and a nested labeled icon is an accessibility anti-pattern).
  // ariaLabel is for the other case: an icon used standalone, with no
  // enclosing labeled control to carry the accessible name instead.
  let { name, size = 16, ariaLabel }: { name: IconName; size?: number; ariaLabel?: string } = $props();
</script>

<svg
  viewBox="0 0 16 16"
  width={size}
  height={size}
  aria-hidden={ariaLabel ? undefined : 'true'}
  aria-label={ariaLabel}
  role={ariaLabel ? 'img' : undefined}
  focusable="false"
  stroke="currentColor"
  stroke-width="2"
  fill="none"
  stroke-linecap="square"
  stroke-linejoin="miter"
>
  {#each PATHS[name] as d (d)}
    <path {d} />
  {/each}
</svg>
