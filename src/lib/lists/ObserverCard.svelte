<script lang="ts">
  // TODO: this row-per-entity edit pattern (own local `editing`/draft
  // state, Save/Cancel via callback props) repeats near-identically
  // across EventRow, UniverseRow, and here/MomentBox. Svelte 5 supports
  // a generic "editable list" component for this (a script block with a
  // generics="T" attribute, plus snippet props for per-column render
  // logic), but that's a real shared-shape design decision, not
  // attempted yet with only 3 call sites to validate it against —
  // revisit if/when a 4th consumer shows up. See PR review thread on the
  // old ObserverList.svelte:193.
  import { generateId } from '../id';
  import IconButton from '../IconButton.svelte';
  import UuidTag from '../UuidTag.svelte';
  import CollapsiblePanel from '../CollapsiblePanel.svelte';
  import MomentSequenceBlock from './MomentSequenceBlock.svelte';
  import DropIndicatorLine from '../dnd/DropIndicatorLine.svelte';
  import { dropBox, type DragBoxData } from '../dnd/actions';
  import { getDragging } from '../dnd/dragState.svelte';
  import { pushUndo } from '../toastQueue.svelte';
  import { moveWithinList, spliceListInto, type Edge } from '../reorder';
  import type { StoryObserver, StoryEvent, Moment, MomentID, SequenceID, EventID } from '../types';

  let {
    observer,
    events,
    onSaveName,
    onDelete,
  }: {
    observer: StoryObserver;
    events: StoryEvent[];
    onSaveName: (name: string) => void;
    onDelete: () => void;
  } = $props();

  let eventOptions = $derived(events.map((e) => ({ id: e.id, label: e.label })));
  function eventLabel(id: string): string {
    return events.find((e) => e.id === id)?.label || '(untitled event)';
  }

  let editingName = $state(false);
  let editName = $state('');
  function startEditName() {
    editName = observer.name;
    editingName = true;
  }
  function saveName() {
    onSaveName(editName.trim() || observer.name);
    editingName = false;
  }
  function cancelEditName() {
    editingName = false;
  }

  // Display label per sequence fragment — just its position in the array;
  // sequences have no meaningful order relative to each other (spec §2)
  // and can be freely drag-reordered (reorderSequences below) purely as a
  // display-order preference, so this label is just "which block on
  // screen," not an identity.
  let sequenceLabels = $derived(observer.sequences.map((s, i) => ({ id: s.id, label: `Sequence ${i + 1}` })));
  let totalMoments = $derived(observer.sequences.reduce((sum, s) => sum + s.moments.length, 0));
  let momentCountLabel = $derived(
    `${totalMoments} moment${totalMoments === 1 ? '' : 's'} · ${observer.sequences.length} sequence${observer.sequences.length === 1 ? '' : 's'}`,
  );

  function addSequence() {
    observer.sequences = [...observer.sequences, { id: generateId(), moments: [] }];
  }

  // storyEvent dropped on the "Add sequence" button -> skip the empty-
  // sequence intermediate state entirely and create one already containing
  // a moment for the dragged event. Same undo treatment as
  // insertEventAsMoment (moment/sequence contents are spec-meaningful).
  function createSequenceWithEvent(eventId: EventID) {
    const before = observer.sequences;
    observer.sequences = [
      ...before,
      { id: generateId(), moments: [{ id: generateId(), events: [eventId], direction: 'forward' }] },
    ];
    pushUndo('Added sequence', () => {
      observer.sequences = before;
    });
  }

  let isAddSequencePotentialTarget = $derived(getDragging()?.level === 'storyEvent');
  let addSequenceHovered = $state(false);

  function removeSequence(seqId: SequenceID) {
    const index = observer.sequences.findIndex((s) => s.id === seqId);
    if (index === -1) return;
    const item = observer.sequences[index];
    observer.sequences = observer.sequences.filter((s) => s.id !== seqId);
    pushUndo('Deleted sequence', () => {
      const restored = [...observer.sequences];
      restored.splice(index, 0, item);
      observer.sequences = restored;
    });
  }

  function addMoment(seqId: SequenceID, moment: Moment) {
    observer.sequences = observer.sequences.map((s) => (s.id === seqId ? { ...s, moments: [...s.moments, moment] } : s));
  }

  function saveMoment(seqId: SequenceID, momentId: string, patch: { events: string[]; direction: 'forward' | 'inverted' }) {
    observer.sequences = observer.sequences.map((s) =>
      s.id === seqId ? { ...s, moments: s.moments.map((m) => (m.id === momentId ? { ...m, ...patch } : m)) } : s,
    );
  }

  function removeMoment(seqId: SequenceID, momentId: string) {
    const sequence = observer.sequences.find((s) => s.id === seqId);
    if (!sequence) return;
    const index = sequence.moments.findIndex((m) => m.id === momentId);
    if (index === -1) return;
    const item = sequence.moments[index];
    observer.sequences = observer.sequences.map((s) =>
      s.id === seqId ? { ...s, moments: s.moments.filter((m) => m.id !== momentId) } : s,
    );
    pushUndo('Deleted moment', () => {
      observer.sequences = observer.sequences.map((s) => {
        if (s.id !== seqId) return s;
        const restored = [...s.moments];
        restored.splice(index, 0, item);
        return { ...s, moments: restored };
      });
    });
  }

  // Moment order within a sequence is spec-meaningful (it's the observer's
  // actual experienced chronological order, not just display order), so
  // unlike a pure reorder of presentation-only data, a bad drop here keeps
  // the same pushUndo safety net as merge/delete.
  function reorderMoments(seqId: SequenceID, draggedMomentId: MomentID, targetMomentId: MomentID, edge: Edge) {
    const before = observer.sequences;
    observer.sequences = before.map((s) =>
      s.id === seqId ? { ...s, moments: moveWithinList(s.moments, draggedMomentId, targetMomentId, edge) } : s,
    );
    pushUndo('Reordered moments', () => {
      observer.sequences = before;
    });
  }

  // Display order among an observer's own sequences has no spec meaning
  // (see sequenceLabels above) — dragging one past another is purely a
  // presentation preference, nothing is lost by a bad drop, so no undo.
  function reorderSequences(draggedId: SequenceID, targetId: SequenceID, edge: Edge) {
    observer.sequences = moveWithinList(observer.sequences, draggedId, targetId, edge);
  }

  // Event order within a moment has no spec meaning (Moment.events is a
  // set) — reordering here is cosmetic consistency with the other two
  // levels, not a data-meaningful edit, so unlike reorderMoments there's
  // no undo toast. It's still persisted (the array order is what's
  // stored and displayed), just not undo-guarded.
  function reorderEvents(seqId: SequenceID, momentId: MomentID, draggedEventId: EventID, targetEventId: EventID, edge: Edge) {
    observer.sequences = observer.sequences.map((s) =>
      s.id !== seqId
        ? s
        : {
            ...s,
            moments: s.moments.map((m) =>
              m.id !== momentId
                ? m
                : {
                    ...m,
                    events: moveWithinList(
                      m.events.map((id) => ({ id })),
                      draggedEventId,
                      targetEventId,
                      edge,
                    ).map((e) => e.id),
                  },
            ),
          },
    );
  }

  // The observer's own sequences list — same shared-gap-indicator pattern
  // as MomentSequenceBlock's moments list, one level up. No self-
  // exclusion in canDropOnSequences (unlike MomentSequenceBlock's own
  // canDropSequence, used for its actual header/trailing hit targets)
  // since a gap isn't tied to one specific sequence's identity —
  // reorderSequences' own no-op guard already makes a drop-on-current-
  // position harmless.
  function canDropOnSequences(source: DragBoxData): boolean {
    return source.level === 'sequence' && source.containerId === observer.id;
  }

  let isSequencesPotentialTarget = $derived.by(() => {
    const dragging = getDragging();
    return dragging !== null && canDropOnSequences(dragging);
  });

  let hoveredSequence = $state<{ id: SequenceID; edge: Edge } | null>(null);

  function updateSequenceHover(seqId: SequenceID, edge: Edge | null) {
    if (edge !== null) {
      hoveredSequence = { id: seqId, edge };
    } else if (hoveredSequence?.id === seqId) {
      hoveredSequence = null;
    }
  }

  // A gap whose immediate neighbor on either side is the sequence
  // currently being dragged is never a real drop position — dropping it
  // there would insert it right back where it already sits (its other
  // neighbor's own canDrop already excludes exact-self, but the neighbor
  // across the gap from it doesn't know that, so without this check the
  // gap right next to the dragged sequence would still light up as if
  // "drop before/after itself" were a real, different position).
  function isSequenceGapExcluded(beforeId: SequenceID | null, afterId: SequenceID | null): boolean {
    const dragging = getDragging();
    return dragging !== null && (dragging.id === beforeId || dragging.id === afterId);
  }

  function isSequenceGapPotential(beforeId: SequenceID | null, afterId: SequenceID | null): boolean {
    return isSequencesPotentialTarget && !isSequenceGapExcluded(beforeId, afterId);
  }

  function isSequenceGapHovered(beforeId: SequenceID | null, afterId: SequenceID | null): boolean {
    if (isSequenceGapExcluded(beforeId, afterId)) return false;
    if (!hoveredSequence) return false;
    if (afterId !== null && hoveredSequence.id === afterId && hoveredSequence.edge === 'top') return true;
    if (beforeId !== null && hoveredSequence.id === beforeId && hoveredSequence.edge === 'bottom') return true;
    return false;
  }

  // Splices the dragged sequence's moments into the target sequence at the
  // position implied by targetMomentId/edge (null/null = append, for the
  // empty-target-sequence drop case), then removes the now-empty source
  // sequence entirely. Undo restores the full pre-merge sequences array
  // wholesale rather than trying to re-split the merged moments back apart
  // — the same "snapshot the whole array" idiom every other undoable edit
  // here uses, since re-deriving the reverse of an arbitrary splice is
  // more failure-prone than a full restore.
  function mergeInto(sourceId: SequenceID, targetId: SequenceID, targetMomentId: MomentID | null, edge: Edge | null) {
    const before = observer.sequences;
    const source = before.find((s) => s.id === sourceId);
    if (!source) return;
    observer.sequences = before
      .filter((s) => s.id !== sourceId)
      .map((s) => (s.id === targetId ? { ...s, moments: spliceListInto(source.moments, s.moments, targetMomentId, edge) } : s));
    pushUndo('Merged sequences', () => {
      observer.sequences = before;
    });
  }

  // Wraps a raw event id in a brand-new single-event Moment and splices it
  // into `seqId` at `index` — 0 = front, moments.length = end, i = "before
  // moment i". One function for all three positions (front/between/end):
  // they're all the same splice, just at a different index computed by
  // whoever actually knows the array (MomentSequenceBlock). Undo for the
  // same reason reorderMoments has it: moment order inside a sequence is
  // spec-meaningful, and a misdropped drag is far likelier than a
  // mis-clicked button.
  function insertEventAsMoment(seqId: SequenceID, eventId: EventID, index: number) {
    const before = observer.sequences;
    observer.sequences = before.map((s) => {
      if (s.id !== seqId) return s;
      const moments = [...s.moments];
      moments.splice(Math.max(0, Math.min(index, moments.length)), 0, {
        id: generateId(),
        events: [eventId],
        direction: 'forward',
      });
      return { ...s, moments };
    });
    pushUndo('Added moment', () => {
      observer.sequences = before;
    });
  }

  function addEventToMoment(seqId: SequenceID, momentId: MomentID, eventId: EventID) {
    const before = observer.sequences;
    const target = before.find((s) => s.id === seqId)?.moments.find((m) => m.id === momentId);
    // Moment.events is a set — a repeat drop of an event already in this
    // moment is a no-op, not a duplicate, and shouldn't push an undo for
    // an edit that didn't actually happen.
    if (!target || target.events.includes(eventId)) return;
    observer.sequences = before.map((s) =>
      s.id !== seqId
        ? s
        : {
            ...s,
            moments: s.moments.map((m) => (m.id !== momentId ? m : { ...m, events: [...m.events, eventId] })),
          },
    );
    pushUndo('Added event to moment', () => {
      observer.sequences = before;
    });
  }
</script>

<CollapsiblePanel open={false}>
  {#snippet titleSnippet()}
    {#if editingName}
      <input
        type="text"
        class="field observer-name-input"
        bind:value={editName}
        onkeydown={(e) => e.key === 'Enter' && saveName()}
        onclick={(e) => e.stopPropagation()}
      />
    {:else}
      <span class="observer-name">{observer.name} <UuidTag id={observer.id} /></span>
    {/if}
    <span class="moment-count mono">{momentCountLabel}</span>
  {/snippet}
  {#snippet actions()}
    {#if editingName}
      <IconButton icon="save" label="Save observer" size="sm" onclick={saveName} />
      <IconButton icon="x" label="Cancel edit" size="sm" onclick={cancelEditName} />
    {:else}
      <IconButton icon="edit" label="Edit observer" size="sm" onclick={startEditName} />
      <IconButton icon="x" label="Delete observer" size="sm" onclick={onDelete} />
    {/if}
  {/snippet}

  <div class="sequences">
    <div class="sequence-gap">
      <DropIndicatorLine
        potential={isSequenceGapPotential(null, observer.sequences[0]?.id ?? null)}
        hovered={isSequenceGapHovered(null, observer.sequences[0]?.id ?? null)}
      />
    </div>
    {#each observer.sequences as sequence, i (sequence.id)}
      <MomentSequenceBlock
        {sequence}
        observerId={observer.id}
        label={sequenceLabels[i].label}
        {eventOptions}
        {eventLabel}
        onAddMoment={(moment) => addMoment(sequence.id, moment)}
        onSaveMoment={(momentId, patch) => saveMoment(sequence.id, momentId, patch)}
        onDeleteMoment={(momentId) => removeMoment(sequence.id, momentId)}
        onDeleteSequence={() => removeSequence(sequence.id)}
        onMergeInto={(sourceId, targetMomentId, edge) => mergeInto(sourceId, sequence.id, targetMomentId, edge)}
        onReorderMoments={(draggedId, targetId, edge) => reorderMoments(sequence.id, draggedId, targetId, edge)}
        onReorderSequences={(draggedId, targetId, edge) => reorderSequences(draggedId, targetId, edge)}
        onReorderEvents={(momentId, draggedId, targetId, edge) =>
          reorderEvents(sequence.id, momentId, draggedId, targetId, edge)}
        onHoverChange={(edge) => updateSequenceHover(sequence.id, edge)}
        onInsertEventAsMoment={(eventId, index) => insertEventAsMoment(sequence.id, eventId, index)}
        onAddEventToMoment={(momentId, eventId) => addEventToMoment(sequence.id, momentId, eventId)}
      />
      <div class="sequence-gap">
        <DropIndicatorLine
          potential={isSequenceGapPotential(sequence.id, observer.sequences[i + 1]?.id ?? null)}
          hovered={isSequenceGapHovered(sequence.id, observer.sequences[i + 1]?.id ?? null)}
        />
      </div>
    {/each}
    <div
      class="add-sequence-drop"
      class:potential-target={isAddSequencePotentialTarget}
      class:hovered={addSequenceHovered}
      use:dropBox={{
        data: () => ({ level: 'sequence', id: observer.id }) as DragBoxData,
        canDrop: (source) => source.level === 'storyEvent',
        onDrop: (source) => createSequenceWithEvent(source.id),
        onHoverChange: (edge) => (addSequenceHovered = edge !== null),
      }}
    >
      <IconButton icon="plus" label="Add sequence" variant="accent" size="sm" onclick={addSequence} />
    </div>
  </div>
</CollapsiblePanel>

<style>
  .observer-name {
    flex: 1;
  }

  .observer-name-input {
    flex: 1;
    max-width: 20rem;
  }

  .moment-count {
    font-size: 0.72rem;
    opacity: 0.5;
  }

  .sequences {
    display: flex;
    flex-direction: column;
    /* Bleed out to the edge of the observer's own outer panel (canceling
       its padding, not this component's own — see the --panel-padding
       comment in CollapsiblePanel.svelte) so a sequence fragment's width
       is limited only by the observer box's own border, not by padding
       meant for the title row and other non-sequence content. */
    margin-inline: calc(var(--panel-padding, 0px) * -1);
    /* This panel can end up quite narrow (the right-hand column of the
       two-column layout). Scroll rather than clip if content genuinely
       can't compress further — but don't force a min-width, or every
       narrow column scrolls even when the content would actually fit. */
    overflow-x: auto;
  }

  /* Fixed-size regardless of potential/hovered state (no layout shift
     when a drag starts), same height as the old flex `gap` it replaces —
     see DropIndicatorLine.svelte / MomentSequenceBlock's own .moment-gap
     for the identical pattern one level deeper. */
  .sequence-gap {
    height: 0.75rem;
  }

  /* Wraps "Add sequence" purely so it can also be a storyEvent drop
     target — IconButton doesn't support forwarding a `use:` action
     through its own button (same reason DragHandle is its own component,
     see its file comment). Outline, not border, so it costs no layout
     shift when a drag starts; same dashed -> solid accent progression as
     MomentBox's .moment-body for the same "drop here" meaning one level
     up (creates a new sequence instead of adding to an existing moment).

     flex-direction: column (matching .sequences' own direction, not the
     inline-flex/row default) is load-bearing, not decorative: the button
     used to be stretched to fill .sequences' full width for free, simply
     by being .sequences' own direct flex-column child (align-items:
     stretch's default cross axis = width in a column). Wrapping it in a
     *row*-direction flex container changed its cross axis to height
     instead, so it silently fell back to its own tiny intrinsic width —
     full-width outline, shrunk square button floating inside it. Matching
     the direction restores the original stretch-to-full-width behavior,
     and padding (rather than the button's own edge) is what gives the
     drop target some breathing room now that it's a real, hoverable
     region rather than just the button's own hit area. */
  .add-sequence-drop {
    display: flex;
    flex-direction: column;
    padding: 0.3rem;
    outline: var(--border-width) dashed transparent;
  }

  .add-sequence-drop.potential-target {
    outline-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
  }

  .add-sequence-drop.hovered {
    outline-style: solid;
    outline-color: var(--color-accent);
  }
</style>
