<script lang="ts">
  // TODO: this row-per-entity edit pattern (own local `editing`/draft
  // state, Save/Cancel via callback props) repeats near-identically
  // across EventRow, UniverseRow, and here/MomentRow. Svelte 5 supports
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
  import { pushUndo } from '../toastQueue.svelte';
  import type { StoryObserver, StoryEvent, Moment, SequenceID } from '../types';

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
  // sequences have no meaningful order relative to each other (spec §2),
  // this is purely "which block on screen" for the merge-target picker.
  let sequenceLabels = $derived(observer.sequences.map((s, i) => ({ id: s.id, label: `Sequence ${i + 1}` })));
  let totalMoments = $derived(observer.sequences.reduce((sum, s) => sum + s.moments.length, 0));
  let momentCountLabel = $derived(
    `${totalMoments} moment${totalMoments === 1 ? '' : 's'} · ${observer.sequences.length} sequence${observer.sequences.length === 1 ? '' : 's'}`,
  );

  function addSequence() {
    observer.sequences = [...observer.sequences, { id: generateId(), moments: [] }];
  }

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

  // Merge is append-only concatenation (source's moments after target's) —
  // fine-grained interleaving is an editor-UI nicety left for later (spec
  // §3). Undo restores the full pre-merge sequences array wholesale rather
  // than trying to re-split the merged moments back apart.
  function mergeInto(sourceId: SequenceID, targetId: SequenceID) {
    const before = observer.sequences;
    const source = before.find((s) => s.id === sourceId);
    if (!source) return;
    observer.sequences = before
      .filter((s) => s.id !== sourceId)
      .map((s) => (s.id === targetId ? { ...s, moments: [...s.moments, ...source.moments] } : s));
    pushUndo('Merged sequences', () => {
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
    {#each observer.sequences as sequence, i (sequence.id)}
      <MomentSequenceBlock
        {sequence}
        label={sequenceLabels[i].label}
        {eventOptions}
        {eventLabel}
        mergeTargets={sequenceLabels.filter((t) => t.id !== sequence.id)}
        onAddMoment={(moment) => addMoment(sequence.id, moment)}
        onSaveMoment={(momentId, patch) => saveMoment(sequence.id, momentId, patch)}
        onDeleteMoment={(momentId) => removeMoment(sequence.id, momentId)}
        onDeleteSequence={() => removeSequence(sequence.id)}
        onMergeInto={(targetId) => mergeInto(sequence.id, targetId)}
      />
    {/each}
    <IconButton icon="plus" label="Add sequence" variant="accent" size="sm" onclick={addSequence} />
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
    gap: 0.75rem;
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
</style>
