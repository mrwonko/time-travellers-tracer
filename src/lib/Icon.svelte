<script module lang="ts">
  export type IconName = 'plus' | 'edit' | 'x' | 'save' | 'chevron';

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
  };
</script>

<script lang="ts">
  let { name, size = 16 }: { name: IconName; size?: number } = $props();
</script>

<svg
  viewBox="0 0 16 16"
  width={size}
  height={size}
  aria-hidden="true"
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
