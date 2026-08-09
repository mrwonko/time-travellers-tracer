<script lang="ts">
  // A single event within a moment, rendered as its own small box rather
  // than folded into a joined-label string — same box-based building
  // block as MomentSequenceBlock/MomentBox, one level deeper. Read-only:
  // event *membership* is still edited via MultiSelectCombobox in
  // MomentBox's edit mode; this only displays (and, once drag lands,
  // reorders) the result.
  import ChamferBox from '../ChamferBox.svelte';

  let { label }: { label: string } = $props();
</script>

<ChamferBox tag="span" size="sm" class="event-chip">
  {label}
</ChamferBox>

<style>
  /* One step further recessed than the moment box it lives inside
     (--color-bg vs. the moment's --color-panel-bg) — continuing the
     same alternating-tint mechanism as MomentBox and, before that,
     MomentSequenceBlock (see a5a3fae). --chamfer-fill inherits down the
     DOM, so this must be set explicitly rather than left to ChamferBox's
     own default. */
  :global(.event-chip) {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    font-size: 0.78rem;
    --chamfer-fill: var(--color-bg);
  }
</style>
