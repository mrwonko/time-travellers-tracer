<script lang="ts">
  // One of an observer's sequence fragments (spec §2/§3: an observer can
  // have several, since a moment's position relative to that observer's
  // *other* moments isn't always known yet at recording time). Owns its
  // own "add moment" draft state — deliberately not lifted to
  // ObserverCard, for the same reason MomentBox keeps its own edit
  // state: multiple blocks can be mid-interaction at once without
  // stomping each other.
  //
  // This block is a drag source (via its header) and has two drop
  // targets of its own (the header = "insert before me", a trailing
  // strip after "add moment" = "insert after me") — both unchanged, real
  // hit-regions. It doesn't render its own insertion-line indicators
  // though: those are single shared elements per gap, owned by
  // ObserverCard, driven by both neighboring sequences' hover state — see
  // DropIndicatorLine.svelte and ObserverCard's isSequenceGapHovered.
  // This block just forwards its own hover state upward via
  // onHoverChange. Its own moments list applies the identical pattern
  // one level deeper, with this component as the "parent" for
  // MomentBox's gaps.
  import { generateId } from '../id';
  import IconButton from '../IconButton.svelte';
  import UuidTag from '../UuidTag.svelte';
  import DirectionToggle from '../DirectionToggle.svelte';
  import MultiSelectCombobox from '../MultiSelectCombobox.svelte';
  import ChamferBox from '../ChamferBox.svelte';
  import MomentBox from './MomentBox.svelte';
  import DragHandle from '../dnd/DragHandle.svelte';
  import DropIndicatorLine from '../dnd/DropIndicatorLine.svelte';
  import { dropBox, type DragBoxData } from '../dnd/actions';
  import { getDragging } from '../dnd/dragState.svelte';
  import type { MomentSequence, Moment, MomentID, SequenceID, EventID, ObserverID } from '../types';
  import type { Edge } from '../reorder';

  let {
    sequence,
    observerId,
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
    onReorderEvents,
    onHoverChange,
  }: {
    sequence: MomentSequence;
    observerId: ObserverID;
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
    onReorderEvents: (momentId: MomentID, draggedEventId: EventID, targetEventId: EventID, edge: Edge) => void;
    onHoverChange: (edge: Edge | null) => void;
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
  // - Dropped on this block's own header or trailing region -> reorder
  //   among the observer's own sequences (edge fixed per region: header
  //   always 'top', trailing always 'bottom' — each is single-purpose,
  //   not split into halves).
  // - Dropped inside a *different* sequence's moments list (MomentBox's
  //   own canDrop, extended to accept 'sequence' sources, or the
  //   moments-empty fallback below) -> merge-splice via onMergeInto.
  // Both regions stay plain siblings of `.moments` (never wrapping it),
  // so they can't double-fire alongside MomentBox's own per-moment
  // merge-splice target: hovering a specific moment is always
  // exclusively a merge-splice target; hovering the header or trailing
  // strip is always exclusively a sibling-reorder target.
  // containerId carries the *observer* id here (sequences don't have a
  // container in the moment/event sense) — without it, a sequence from a
  // different observer would look droppable (sequence ids are globally
  // unique, so `source.id !== sequence.id` alone can't tell "different
  // sequence, same observer" from "different observer entirely"). The
  // actual mergeInto/reorderSequences calls already no-op safely for a
  // cross-observer id that doesn't exist in *this* observer's own
  // sequences array, but offering it as a valid-looking drop target would
  // be misleading now that valid targets are shown explicitly.
  const dragData: DragBoxData = $derived({ level: 'sequence', id: sequence.id, containerId: observerId });

  function canDropSequence(source: DragBoxData): boolean {
    return source.level === 'sequence' && source.id !== sequence.id && source.containerId === observerId;
  }

  function canDropEmptyMoments(source: DragBoxData): boolean {
    return source.level === 'sequence' && source.id !== sequence.id && source.containerId === observerId;
  }

  let emptyMomentsHovered = $state(false);

  function handleEmptyMomentsDrop(source: DragBoxData) {
    if (source.level !== 'sequence') return;
    onMergeInto(source.id, null, null);
  }

  let isEmptyMomentsPotentialTarget = $derived.by(() => {
    const dragging = getDragging();
    return dragging !== null && canDropEmptyMoments(dragging);
  });

  // This block's own moments list — same shared-gap-indicator pattern as
  // ObserverCard's sequences list, one level deeper. No self-exclusion in
  // canDropOnMoments (unlike MomentBox's own per-moment canDrop, used for
  // its actual hit target) since a gap isn't tied to one specific
  // moment's identity — reorderMoments' own no-op guard already makes a
  // drop-on-current-position harmless.
  function canDropOnMoments(source: DragBoxData): boolean {
    if (source.level === 'moment') return source.containerId === sequence.id;
    if (source.level === 'sequence') return source.containerId === observerId && source.id !== sequence.id;
    return false;
  }

  let isMomentsPotentialTarget = $derived.by(() => {
    const dragging = getDragging();
    return dragging !== null && canDropOnMoments(dragging);
  });

  let hoveredMoment = $state<{ id: MomentID; edge: Edge } | null>(null);

  function updateMomentHover(momentId: MomentID, edge: Edge | null) {
    if (edge !== null) {
      hoveredMoment = { id: momentId, edge };
    } else if (hoveredMoment?.id === momentId) {
      hoveredMoment = null;
    }
  }

  // See ObserverCard's identical isSequenceGapExcluded for why: the gap
  // right next to the dragged moment itself is never a real drop
  // position, since it would just re-insert it where it already is.
  function isMomentGapExcluded(beforeId: MomentID | null, afterId: MomentID | null): boolean {
    const dragging = getDragging();
    return dragging !== null && (dragging.id === beforeId || dragging.id === afterId);
  }

  function isMomentGapPotential(beforeId: MomentID | null, afterId: MomentID | null): boolean {
    return isMomentsPotentialTarget && !isMomentGapExcluded(beforeId, afterId);
  }

  function isMomentGapHovered(beforeId: MomentID | null, afterId: MomentID | null): boolean {
    if (isMomentGapExcluded(beforeId, afterId)) return false;
    if (!hoveredMoment) return false;
    if (afterId !== null && hoveredMoment.id === afterId && hoveredMoment.edge === 'top') return true;
    if (beforeId !== null && hoveredMoment.id === beforeId && hoveredMoment.edge === 'bottom') return true;
    return false;
  }
</script>

<ChamferBox size="sm" class="sequence-block">
  <div
    class="sequence-header"
    data-drag-box
    use:dropBox={{
      data: () => dragData,
      canDrop: canDropSequence,
      onDrop: (source) => onReorderSequences(source.id, sequence.id, 'top'),
      onHoverChange: (edge) => onHoverChange(edge !== null ? 'top' : null),
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
      class:potential-target={isEmptyMomentsPotentialTarget}
      class:hovered={emptyMomentsHovered}
      use:dropBox={{
        data: () => ({ level: 'sequence', id: sequence.id }) as DragBoxData,
        canDrop: canDropEmptyMoments,
        onDrop: handleEmptyMomentsDrop,
        onHoverChange: (edge) => (emptyMomentsHovered = edge !== null),
      }}
    >
      No moments yet — drag another sequence here to merge it in.
    </div>
  {:else}
    <div class="moments">
      <div class="moment-gap">
        <DropIndicatorLine
          potential={isMomentGapPotential(null, sequence.moments[0]?.id ?? null)}
          hovered={isMomentGapHovered(null, sequence.moments[0]?.id ?? null)}
        />
      </div>
      {#each sequence.moments as moment, i (moment.id)}
        <MomentBox
          {moment}
          index={i + 1}
          sequenceId={sequence.id}
          {observerId}
          {eventOptions}
          {eventLabel}
          onSave={(patch) => onSaveMoment(moment.id, patch)}
          onDelete={() => onDeleteMoment(moment.id)}
          onReorder={(draggedId, targetId, edge) => onReorderMoments(draggedId, targetId, edge)}
          onMergeInto={(sourceSeqId, targetMomentId, edge) => onMergeInto(sourceSeqId, targetMomentId, edge)}
          onReorderEvents={(draggedId, targetId, edge) => onReorderEvents(moment.id, draggedId, targetId, edge)}
          onHoverChange={(edge) => updateMomentHover(moment.id, edge)}
        />
        <div class="moment-gap">
          <DropIndicatorLine
            potential={isMomentGapPotential(moment.id, sequence.moments[i + 1]?.id ?? null)}
            hovered={isMomentGapHovered(moment.id, sequence.moments[i + 1]?.id ?? null)}
          />
        </div>
      {/each}
    </div>
  {/if}

  <div class="add-moment">
    <MultiSelectCombobox options={eventOptions} bind:selected={newMomentEvents} placeholder="Events…" />
    <DirectionToggle bind:direction={newMomentDirection} />
    <IconButton icon="plus" label="Add moment" variant="accent" size="sm" onclick={addMoment} />
  </div>

  <!-- The trailing counterpart to the header above — "insert after this
       sequence". Fixed size (not collapsing/expanding with drag state —
       no layout shift when a drag starts, matching the editor's near-
       zero-motion principle), purely a hit-region now; its own
       insertion-line lives in ObserverCard's shared gap indicator. -->
  <div
    class="sequence-drop-after"
    data-drag-box
    use:dropBox={{
      data: () => dragData,
      canDrop: canDropSequence,
      onDrop: (source) => onReorderSequences(source.id, sequence.id, 'bottom'),
      onHoverChange: (edge) => onHoverChange(edge !== null ? 'bottom' : null),
    }}
  ></div>
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
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.6rem;
  }

  /* Fixed-size hit-region, no visual footprint of its own (see the big
     comment above the template for why the indicator moved out). */
  .sequence-drop-after {
    height: 0.6rem;
    margin-top: 0.6rem;
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
  }

  /* Fixed-size regardless of potential/hovered state (no layout shift
     when a drag starts), same height as the old flex `gap` it replaces. */
  .moment-gap {
    height: 0.5rem;
  }

  .moments-empty {
    padding: 0.75rem;
    text-align: center;
    font-size: 0.8rem;
    opacity: 0.5;
    border: var(--border-width) dashed var(--color-border-strong);
  }

  /* Same subtle-dashed -> bright transition as the other drop targets,
     applied to this box's own always-dashed resting state: a valid drag
     in flight tints the dashed border toward the accent color, and
     actually hovering it (the only "edge" this target has, since it
     always appends) goes fully bright — the same signal the insertion
     lines give elsewhere, just as a full border instead of one edge,
     since there's no moment to attach an edge to. This one keeps its own
     local rendering (not shared) since there's no adjacent element to
     duplicate with — it's the sole target for an empty sequence. */
  .moments-empty.potential-target {
    opacity: 1;
    border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
  }

  .moments-empty.hovered {
    border-color: var(--color-accent);
  }

  .add-moment {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.6rem;
  }
</style>
