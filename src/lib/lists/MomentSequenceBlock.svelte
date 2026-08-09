<script lang="ts">
  // One of an observer's sequence fragments (spec §2/§3: an observer can
  // have several, since a moment's position relative to that observer's
  // *other* moments isn't always known yet at recording time). Owns its
  // own "add moment" draft state and its own merge-target selection —
  // deliberately not lifted to ObserverCard, for the same reason MomentBox
  // keeps its own edit state: multiple blocks can be mid-interaction at
  // once without stomping each other.
  import { generateId } from '../id';
  import IconButton from '../IconButton.svelte';
  import UuidTag from '../UuidTag.svelte';
  import DirectionToggle from '../DirectionToggle.svelte';
  import MultiSelectCombobox from '../MultiSelectCombobox.svelte';
  import ChamferBox from '../ChamferBox.svelte';
  import MomentBox from './MomentBox.svelte';
  import DragHandle from '../dnd/DragHandle.svelte';
  import { dropBox, type DragBoxData } from '../dnd/actions';
  import type { MomentSequence, Moment, MomentID, SequenceID } from '../types';
  import type { Edge } from '../reorder';

  let {
    sequence,
    label,
    eventOptions,
    eventLabel,
    onAddMoment,
    onSaveMoment,
    onDeleteMoment,
    onDeleteSequence,
    onMergeInto,
    onReorderMoments,
    onReorderSequences,
  }: {
    sequence: MomentSequence;
    label: string;
    eventOptions: { id: string; label: string }[];
    eventLabel: (id: string) => string;
    onAddMoment: (moment: Moment) => void;
    onSaveMoment: (momentId: string, patch: { events: string[]; direction: 'forward' | 'inverted' }) => void;
    onDeleteMoment: (momentId: string) => void;
    onDeleteSequence: () => void;
    onMergeInto: (sourceSequenceId: SequenceID, targetMomentId: MomentID | null, edge: Edge | null) => void;
    onReorderMoments: (draggedMomentId: MomentID, targetMomentId: MomentID, edge: Edge) => void;
    onReorderSequences: (draggedSequenceId: SequenceID, targetSequenceId: SequenceID, edge: Edge) => void;
  } = $props();

  // Deliberately just a one-time default, like ObserverCard's own
  // newMomentEvents — doesn't need to track later changes to eventOptions.
  // svelte-ignore state_referenced_locally
  let newMomentEvents = $state<string[]>(eventOptions[0] ? [eventOptions[0].id] : []);
  let newMomentDirection = $state<'forward' | 'inverted'>('forward');
  function addMoment() {
    if (!newMomentEvents.length) return;
    onAddMoment({ id: generateId(), events: newMomentEvents, direction: newMomentDirection });
  }

  // Dragging this sequence's handle does one of two things depending on
  // where it's dropped, not on anything different about the drag itself
  // (both share this one `level: 'sequence'` payload):
  // - Dropped on a sibling sequence's header (this block's own dropBox
  //   below) -> reorder among the observer's own sequences.
  // - Dropped inside a *different* sequence's moments list (MomentBox's
  //   own canDrop, extended to accept 'sequence' sources, or the
  //   moments-empty fallback below) -> merge-splice via onMergeInto.
  const dragData: DragBoxData = $derived({ level: 'sequence', id: sequence.id });

  function canDropSequence(source: DragBoxData): boolean {
    return source.level === 'sequence' && source.id !== sequence.id;
  }

  let hoverEdge = $state<Edge | null>(null);

  function handleSequenceDrop(source: DragBoxData, edge: Edge) {
    onReorderSequences(source.id, sequence.id, edge);
  }

  function handleEmptyMomentsDrop(source: DragBoxData) {
    if (source.level !== 'sequence') return;
    onMergeInto(source.id, null, null);
  }
</script>

<ChamferBox size="sm" class="sequence-block">
  <div
    class="sequence-header"
    class:drop-top={hoverEdge === 'top'}
    class:drop-bottom={hoverEdge === 'bottom'}
    data-drag-box
    use:dropBox={{
      data: () => dragData,
      canDrop: canDropSequence,
      onDrop: handleSequenceDrop,
      onHoverChange: (edge) => (hoverEdge = edge),
    }}
  >
    <DragHandle label={`Drag "${label}" to reorder, or drop onto another sequence's moments to merge`} data={() => dragData} />
    <span class="sequence-label">{label} <UuidTag id={sequence.id} /></span>
    <span class="moment-count mono">{sequence.moments.length} moment{sequence.moments.length === 1 ? '' : 's'}</span>
    <div class="sequence-actions">
      <IconButton icon="x" label={`Delete "${label}"`} size="sm" onclick={onDeleteSequence} />
    </div>
  </div>

  {#if sequence.moments.length === 0}
    <div
      class="moments-empty"
      use:dropBox={{
        data: () => ({ level: 'sequence', id: sequence.id }) as DragBoxData,
        canDrop: (source) => source.level === 'sequence' && source.id !== sequence.id,
        onDrop: handleEmptyMomentsDrop,
      }}
    >
      No moments yet — drag another sequence here to merge it in.
    </div>
  {:else}
    <div class="moments">
      {#each sequence.moments as moment, i (moment.id)}
        <MomentBox
          {moment}
          index={i + 1}
          sequenceId={sequence.id}
          {eventOptions}
          {eventLabel}
          onSave={(patch) => onSaveMoment(moment.id, patch)}
          onDelete={() => onDeleteMoment(moment.id)}
          onReorder={(draggedId, targetId, edge) => onReorderMoments(draggedId, targetId, edge)}
          onMergeInto={(sourceSeqId, targetMomentId, edge) => onMergeInto(sourceSeqId, targetMomentId, edge)}
        />
      {/each}
    </div>
  {/if}

  <div class="add-moment">
    <MultiSelectCombobox options={eventOptions} bind:selected={newMomentEvents} placeholder="Events…" />
    <DirectionToggle bind:direction={newMomentDirection} />
    <IconButton icon="plus" label="Add moment" variant="accent" size="sm" onclick={addMoment} />
  </div>
</ChamferBox>

<style>
  :global(.sequence-block) {
    /* Uniform inline padding at every width now that moments are their own
       boxes rather than table rows — the old version relied on the
       moments table's own per-cell padding at desktop widths (only adding
       its own padding-inline back below 720px, where app.css's mobile
       .data-table rules zeroed that out). A box list has no such built-in
       inset to borrow, so this block insets itself unconditionally. */
    padding: 0.75rem 0.9rem 0.9rem;
    /* Fill with the page's base background rather than the observer
       panel's own (--color-panel-bg, ChamferBox's default) — a step back
       in the light/dark elevation direction either way (paper-white vs.
       pure-white in light mode, near-black vs. panel's slightly-lighter
       near-black in dark mode) reads as "recessed into the observer card"
       in both themes, which is what visually marks a sequence fragment as
       its own kind of thing, without reaching for an off-brand accent
       hue. --chamfer-fill is ChamferBox's own hook for this (see its
       `::before`); border itself stays the standard hairline. */
    --chamfer-fill: var(--color-bg);
  }

  .sequence-header {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.6rem;
  }

  /* Same insertion-indicator mechanism as MomentBox's — a live top/bottom
     bar shown while a sibling sequence is being dragged over this one's
     header, at the position it'd land at. */
  .sequence-header::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--color-accent);
    opacity: 0;
    pointer-events: none;
  }

  .sequence-header.drop-top::before {
    top: -0.4rem;
    opacity: 1;
  }

  .sequence-header.drop-bottom::before {
    bottom: -0.4rem;
    opacity: 1;
  }

  .sequence-label {
    font-size: 0.85rem;
  }

  .moment-count {
    font-size: 0.72rem;
    opacity: 0.5;
  }

  .sequence-actions {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-left: auto;
  }

  .moments {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .moments-empty {
    padding: 0.75rem;
    text-align: center;
    font-size: 0.8rem;
    opacity: 0.5;
    border: var(--border-width) dashed var(--color-border-strong);
  }

  .add-moment {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.6rem;
  }
</style>
