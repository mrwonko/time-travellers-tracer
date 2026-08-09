<script lang="ts">
  // The single shared "you could drop here" preview for one gap position
  // between two adjacent drop targets (or before the first / after the
  // last). Purely visual — no dropBox of its own, no hit-testing. The
  // actual drop targets stay the adjacent real elements (MomentBox,
  // EventChip, the sequence header/trailing region), each still large
  // and independently interactive; this just renders the *one* line that
  // represents the position between (up to) two of them, so a gap
  // touched by two neighbors never draws two independently-positioned
  // lines a few pixels apart. The caller computes `potential`/`hovered`
  // by combining both neighbors' hover state — see MomentSequenceBlock's
  // isGapHovered for the pattern.
  let {
    orientation = 'horizontal',
    potential,
    hovered,
  }: {
    orientation?: 'horizontal' | 'vertical';
    potential: boolean;
    hovered: boolean;
  } = $props();
</script>

<div class="drop-indicator-line" class:vertical={orientation === 'vertical'} class:potential class:hovered></div>

<style>
  .drop-indicator-line {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  /* border-width is pinned per-side (not just given a value on the one
     visible side) so that the .hovered/.potential rules below can use the
     border-style/border-color *shorthands* — which set all four sides —
     without accidentally drawing a border on the other three sides at
     the browser's default ~3px width. Only the side with nonzero width
     ever renders, regardless of what style/color the other three get. */
  .drop-indicator-line::before {
    content: '';
    display: block;
    width: 100%;
    border-style: solid;
    border-color: transparent;
    border-width: 2px 0 0 0;
  }

  .drop-indicator-line.vertical::before {
    width: 0;
    height: 100%;
    border-width: 0 0 0 2px;
  }

  /* Bright, solid: this is the exact insertion point under the pointer
     right now. */
  .drop-indicator-line.hovered::before {
    border-color: var(--color-accent);
  }

  /* Subtle dashed: a compatible drag is in flight and this position is
     valid, but it isn't the one currently hovered — shown up front for
     every valid gap, not just discoverable by hovering each one. */
  .drop-indicator-line.potential:not(.hovered)::before {
    border-style: dashed;
    border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
  }
</style>
