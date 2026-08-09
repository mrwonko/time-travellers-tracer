<script lang="ts">
  // Test-only fixture — exercises dragHandle/dropBox from actions.ts
  // without needing a real box component. Not used by the app itself.
  import { dragHandle, dropBox, type DragBoxData } from './actions';
  import type { Edge } from '../reorder';

  let {
    data,
    canDrop = () => true,
    onDrop = () => {},
    wrapInBox = true,
  }: {
    data: DragBoxData;
    canDrop?: (source: DragBoxData) => boolean;
    onDrop?: (source: DragBoxData, edge: Edge) => void;
    wrapInBox?: boolean;
  } = $props();
</script>

{#if wrapInBox}
  <div data-drag-box data-testid="box">
    <button use:dragHandle={() => data} data-testid="handle">grip</button>
    <div use:dropBox={{ data: () => data, canDrop, onDrop }} data-testid="dropzone"></div>
  </div>
{:else}
  <button use:dragHandle={() => data} data-testid="handle">grip</button>
{/if}
