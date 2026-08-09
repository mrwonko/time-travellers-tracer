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
  // - Dropped on this block's own leading region (the header) or trailing
  //   region (the strip after "add moment", below) -> reorder among the
  //   observer's own sequences. Each region is single-purpose ("insert
  //   before me" / "insert after me") rather than one region split into
  //   top/bottom halves of the *whole* block (including its moments
  //   list) — a whole-block target would double-fire alongside
  //   MomentBox's own merge-splice drop (hovering a specific moment would
  //   simultaneously match "somewhere in the bottom half of this whole
  //   block" *and* "this specific moment"), and its indicator couldn't
  //   render at the block's real edges without first solving that
  //   overlap. Keeping both regions as plain siblings of `.moments` (not
  //   wrapping it) avoids the overlap entirely and keeps both regions
  //   comfortably large (the header's full size, not a thin strip) —
  //   hovering a specific moment is always exclusively a merge-splice
  //   target; hovering the header or trailing strip is always exclusively
  //   a sibling-reorder target.
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

  // Shared by both the leading (header) and trailing regions — both are
  // valid whenever any *other* sequence of this observer is being
  // dragged, regardless of which one ends up hovered.
  let isReorderPotentialTarget = $derived.by(() => {
    const dragging = getDragging();
    return dragging !== null && canDropSequence(dragging);
  });

  let beforeHovered = $state(false);
  let afterHovered = $state(false);

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
</script>

<!-- Plain wrapper, no chamfer/clip-path of its own — purely so the
     leading-region indicator line (::before below) can be positioned
     slightly *outside* the visual card without being clipped away by
     ChamferBox's own clip-path (which clips its whole subtree, including
     descendants positioned beyond its own box — confirmed by inspecting
     rendered pixels: the line was computing the right styles but
     invisible until moved out here). Same reasoning MomentBox's
     .moment-drag-box wrapper already relies on for its own indicator.
     The actual drop-target hit-region stays scoped to .sequence-header
     inside, unchanged — this wrapper has no use:dropBox of its own. -->
<div class="sequence-lead" class:hovered={beforeHovered} class:potential={isReorderPotentialTarget && !beforeHovered}>
  <ChamferBox size="sm" class="sequence-block">
    <div
      class="sequence-header"
      data-drag-box
      use:dropBox={{
        data: () => dragData,
        canDrop: canDropSequence,
        onDrop: (source) => onReorderSequences(source.id, sequence.id, 'top'),
        onHoverChange: (edge) => (beforeHovered = edge !== null),
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

  <!-- The trailing counterpart to the leading region's ::before above —
       "insert after this sequence", the capability that was missing
       entirely before (the header alone had no way to represent
       anything past the end of this block). A sibling of ChamferBox
       (not nested inside it), for the same clip-path reason as this
       wrapper's own comment. Collapsed to zero height when not relevant,
       so it doesn't add permanent visual clutter to every sequence card;
       expands the moment any compatible drag starts anywhere on the
       page (driven by isReorderPotentialTarget, not by being hovered
       first — see MomentBox's isPotentialTarget comment for why "show
       every valid target up front" needs that). -->
  <div
    class="sequence-drop-after"
    class:hovered={afterHovered}
    class:potential={isReorderPotentialTarget && !afterHovered}
    use:dropBox={{
      data: () => dragData,
      canDrop: canDropSequence,
      onDrop: (source) => onReorderSequences(source.id, sequence.id, 'bottom'),
      onHoverChange: (edge) => (afterHovered = edge !== null),
    }}
  ></div>
</div>

<style>
  .sequence-lead {
    position: relative;
  }

  /* Leading insertion-line indicator — "insert before this sequence".
     Positioned relative to this unclipped wrapper (not .sequence-header
     itself), landing at the block's real top edge; half of .sequences'
     own flex gap (0.75rem, in ObserverCard.svelte) above it lands the
     line exactly in the real gap between sequence blocks, not inside
     one (the bug this whole restructuring fixes). Single-purpose (not
     split into top/bottom halves like MomentBox's edges): the header
     represents exactly one insertion point, so there's no edge to
     compute from where within it a drop lands. */
  .sequence-lead::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: -0.375rem;
    height: 0;
    border-top: 2px solid transparent;
    pointer-events: none;
  }

  .sequence-lead.hovered::before {
    border-top-color: var(--color-accent);
  }

  .sequence-lead.potential::before {
    border-top-style: dashed;
    border-top-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
  }

  :global(.sequence-block) {
    /* Uniform inline padding at every width now that moments are their own
       boxes rather than table rows — the old version relied on the
       moments table's own per-cell padding at desktop widths (only adding
       its own padding-inline back below 720px, where app.css's mobile
       .data-table rules zeroed that out). A box list has no such built-in
       inset to borrow, so this block insets itself unconditionally. Top
       padding lives on .sequence-header instead (below) so its own
       drop-target hitbox extends all the way to this block's real top
       edge, rather than just its own tight content box. */
    padding: 0 0.9rem 0.9rem;
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
    padding-top: 0.75rem;
    margin-bottom: 0.6rem;
  }

  /* Trailing counterpart — "insert after this sequence". Mirrors the
     leading region above: single-purpose, collapsed to zero height (no
     permanent visual footprint) until a compatible drag is actually in
     flight, when it grows enough to be a comfortable target in its own
     right (not a thin strip). */
  .sequence-drop-after {
    position: relative;
    height: 0;
  }

  .sequence-drop-after.potential,
  .sequence-drop-after.hovered {
    height: 0.9rem;
    margin-top: 0.4rem;
  }

  .sequence-drop-after::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: -0.375rem;
    height: 0;
    border-top: 2px solid transparent;
    pointer-events: none;
  }

  .sequence-drop-after.hovered::before {
    border-top-color: var(--color-accent);
  }

  .sequence-drop-after.potential::before {
    border-top-style: dashed;
    border-top-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
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

  /* Same subtle-dashed -> bright transition as the other drop targets,
     applied to this box's own always-dashed resting state: a valid drag
     in flight tints the dashed border toward the accent color, and
     actually hovering it (the only "edge" this target has, since it
     always appends) goes fully bright — the same signal the top/bottom
     insertion bars give elsewhere, just as a full border instead of one
     edge, since there's no moment to attach an edge to. */
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
