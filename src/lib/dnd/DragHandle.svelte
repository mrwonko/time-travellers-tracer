<script lang="ts">
  // Shared grip handle for all three drag-and-drop nesting levels
  // (sequence/moment/event) — one component so they look and behave
  // identically, rather than each box growing its own copy. Deliberately
  // its own element rather than IconButton: a drag handle has no click
  // action and different feedback (grab/grabbing cursor, no click-flash)
  // from IconButton's press/click semantics, and IconButton doesn't
  // support forwarding a `use:` action through its own button anyway
  // (use: only applies to elements written directly in a template, not
  // through a component boundary).
  import Icon from '../Icon.svelte';
  import { dragHandle, type DragBoxData } from './actions';

  let { label, data }: { label: string; data: () => DragBoxData } = $props();
</script>

<button type="button" class="drag-handle" use:dragHandle={data} aria-label={label} title={label}>
  <Icon name="grip" size={14} />
</button>

<style>
  .drag-handle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 2.25rem;
    min-height: 2.25rem;
    background: none;
    border: none;
    color: var(--color-fg);
    opacity: 0.55;
    cursor: grab;
    transition: opacity var(--duration-fast) var(--ease-standard);
  }

  .drag-handle:hover,
  .drag-handle:focus-visible {
    opacity: 1;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .drag-handle:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }
</style>
