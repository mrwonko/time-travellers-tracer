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
  // onHoverChange. Its own moments list applies a similar pattern one
  // level deeper for moment/sequence drags (MomentBox's own onHoverChange
  // bubbling up to updateMomentHover) — but a storyEvent drag targets the
  // .moment-gap divs *themselves*, directly (see the gap dropBox below):
  // unlike reordering an existing moment/sequence (which has a real box to
  // grab and an edge to be closest to), inserting a *new* moment has no
  // existing box to attach a "closest edge" position to, and proxying it
  // through the neighboring MomentBox's header (an earlier version of this
  // did exactly that) meant the visible insertion-line hint didn't
  // correspond to where you actually had to drop — you had to hover the
  // moment *below* the gap you wanted. Making the gap its own drop target
  // fixes that directly, and as a side effect uniformly covers "insert
  // after the last moment" too (previously only reachable via the
  // far-away .sequence-drop-after strip below the add-moment row).
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
    onInsertEventAsMoment,
    onAddEventToMoment,
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
    // storyEvent dropped at index `index` within this sequence -> wrap it
    // in a brand-new moment spliced in there (0 = front, moments.length =
    // end). storyEvent dropped on an existing moment (handled in
    // MomentBox, threaded through as onAddEventToMoment) -> add it to that
    // moment instead.
    onInsertEventAsMoment: (eventId: EventID, index: number) => void;
    onAddEventToMoment: (momentId: MomentID, eventId: EventID) => void;
  } = $props();

  let newMomentEvents = $state<string[]>([]);
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
    if (source.level === 'storyEvent') return true;
    return source.level === 'sequence' && source.id !== sequence.id && source.containerId === observerId;
  }

  let emptyMomentsHovered = $state(false);

  function handleEmptyMomentsDrop(source: DragBoxData) {
    if (source.level === 'storyEvent') {
      onInsertEventAsMoment(source.id, 0);
    } else if (source.level === 'sequence') {
      onMergeInto(source.id, null, null);
    }
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
  // position, since it would just re-insert it where it already is. Only
  // relevant to moment/sequence drags — a storyEvent drag has no existing
  // list entry to be "next to", every gap is always a valid insertion
  // point for it.
  function isMomentGapExcluded(beforeId: MomentID | null, afterId: MomentID | null): boolean {
    const dragging = getDragging();
    return dragging !== null && (dragging.id === beforeId || dragging.id === afterId);
  }

  // Each gap div is its own real drop target for a storyEvent drag (see
  // the dropBox registration in the template) — index-addressed, not
  // id/edge-addressed like hoveredMoment, since a gap has no moment
  // identity of its own. Kept as a separate hover source from
  // hoveredMoment (used for actual moment/sequence reorders) rather than
  // reusing it, since a gap's "hovered" state is a direct hit on the gap
  // itself, not something bubbled up from a neighboring box.
  let hoveredGapIndex = $state<number | null>(null);

  function updateGapHover(index: number, edge: Edge | null) {
    if (edge !== null) hoveredGapIndex = index;
    else if (hoveredGapIndex === index) hoveredGapIndex = null;
  }

  function isMomentGapPotential(beforeId: MomentID | null, afterId: MomentID | null): boolean {
    if (getDragging()?.level === 'storyEvent') return true;
    return isMomentsPotentialTarget && !isMomentGapExcluded(beforeId, afterId);
  }

  function isMomentGapHovered(beforeId: MomentID | null, afterId: MomentID | null, index: number): boolean {
    if (getDragging()?.level === 'storyEvent') return hoveredGapIndex === index;
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
      No moments yet — drop an event here, or drag another sequence in to merge it.
    </div>
  {:else}
    <div class="moments">
      <div
        class="moment-gap"
        use:dropBox={{
          data: () => ({ level: 'sequence', id: sequence.id }) as DragBoxData,
          canDrop: (source) => source.level === 'storyEvent',
          onDrop: (source) => onInsertEventAsMoment(source.id, 0),
          onHoverChange: (edge) => updateGapHover(0, edge),
        }}
      >
        <DropIndicatorLine
          potential={isMomentGapPotential(null, sequence.moments[0]?.id ?? null)}
          hovered={isMomentGapHovered(null, sequence.moments[0]?.id ?? null, 0)}
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
          onAddEvent={(eventId) => onAddEventToMoment(moment.id, eventId)}
        />
        <div
          class="moment-gap"
          use:dropBox={{
            data: () => ({ level: 'sequence', id: sequence.id }) as DragBoxData,
            canDrop: (source) => source.level === 'storyEvent',
            onDrop: (source) => onInsertEventAsMoment(source.id, i + 1),
            onHoverChange: (edge) => updateGapHover(i + 1, edge),
          }}
        >
          <DropIndicatorLine
            potential={isMomentGapPotential(moment.id, sequence.moments[i + 1]?.id ?? null)}
            hovered={isMomentGapHovered(moment.id, sequence.moments[i + 1]?.id ?? null, i + 1)}
          />
        </div>
      {/each}
    </div>
  {/if}

  <div class="add-moment">
    <MultiSelectCombobox options={eventOptions} bind:selected={newMomentEvents} placeholder="Events…" />
    <DirectionToggle bind:direction={newMomentDirection} />
    <IconButton
      icon="plus"
      label="Add moment"
      variant="accent"
      size="sm"
      onclick={addMoment}
      disabled={!newMomentEvents.length}
    />
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
     when a drag starts) — a bit taller than the flex `gap` it originally
     just visually replaced (0.5rem), since it's now also a real drop
     target for a storyEvent drag (see the dropBox registrations above),
     not purely decorative. */
  .moment-gap {
    height: 0.75rem;
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
