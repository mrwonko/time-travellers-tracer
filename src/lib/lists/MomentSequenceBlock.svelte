<script lang="ts">
  // One of an observer's sequence fragments (spec §2/§3: an observer can
  // have several, since a moment's position relative to that observer's
  // *other* moments isn't always known yet at recording time). Owns its
  // own "add moment" draft state and its own merge-target selection —
  // deliberately not lifted to ObserverCard, for the same reason MomentRow
  // keeps its own edit state: multiple blocks can be mid-interaction at
  // once without stomping each other.
  import { generateId } from '../id';
  import IconButton from '../IconButton.svelte';
  import UuidTag from '../UuidTag.svelte';
  import DirectionToggle from '../DirectionToggle.svelte';
  import MultiSelectCombobox from '../MultiSelectCombobox.svelte';
  import ChamferBox from '../ChamferBox.svelte';
  import MomentRow from './MomentRow.svelte';
  import type { MomentSequence, Moment, SequenceID } from '../types';

  let {
    sequence,
    label,
    eventOptions,
    eventLabel,
    mergeTargets,
    onAddMoment,
    onSaveMoment,
    onDeleteMoment,
    onDeleteSequence,
    onMergeInto,
  }: {
    sequence: MomentSequence;
    label: string;
    eventOptions: { id: string; label: string }[];
    eventLabel: (id: string) => string;
    mergeTargets: { id: SequenceID; label: string }[];
    onAddMoment: (moment: Moment) => void;
    onSaveMoment: (momentId: string, patch: { events: string[]; direction: 'forward' | 'inverted' }) => void;
    onDeleteMoment: (momentId: string) => void;
    onDeleteSequence: () => void;
    onMergeInto: (targetId: SequenceID) => void;
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

  let mergeTarget = $state<SequenceID | ''>('');
  function mergeInto() {
    if (!mergeTarget) return;
    onMergeInto(mergeTarget);
    mergeTarget = '';
  }
</script>

<ChamferBox size="sm" class="sequence-block">
  <div class="sequence-header">
    <span class="sequence-label">{label} <UuidTag id={sequence.id} /></span>
    <span class="moment-count mono">{sequence.moments.length} moment{sequence.moments.length === 1 ? '' : 's'}</span>
    <div class="sequence-actions">
      {#if mergeTargets.length}
        <select class="field merge-select" bind:value={mergeTarget} aria-label={`Merge "${label}" into…`}>
          <option value="">Merge into…</option>
          {#each mergeTargets as target (target.id)}
            <option value={target.id}>{target.label}</option>
          {/each}
        </select>
        <IconButton
          icon="merge"
          label={`Merge "${label}" into selected sequence`}
          size="sm"
          onclick={mergeInto}
          disabled={!mergeTarget}
        />
      {/if}
      <IconButton icon="x" label={`Delete "${label}"`} size="sm" onclick={onDeleteSequence} />
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th>#</th>
        <th>Event</th>
        <th>Direction</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each sequence.moments as moment, i (moment.id)}
        <MomentRow
          {moment}
          index={i + 1}
          {eventOptions}
          {eventLabel}
          onSave={(patch) => onSaveMoment(moment.id, patch)}
          onDelete={() => onDeleteMoment(moment.id)}
        />
      {/each}
      <tr class="add-row">
        <td></td>
        <td>
          <MultiSelectCombobox options={eventOptions} bind:selected={newMomentEvents} placeholder="Events…" />
        </td>
        <td>
          <DirectionToggle bind:direction={newMomentDirection} />
        </td>
        <td class="actions">
          <IconButton icon="plus" label="Add moment" variant="accent" size="sm" onclick={addMoment} />
        </td>
      </tr>
    </tbody>
  </table>
</ChamferBox>

<style>
  /* No side padding — the table's own cell padding already insets its
     content, and this block is often the narrowest thing on the page (the
     editor's right-hand column, further indented as a sequence within an
     observer); reclaiming the extra wrapper padding is what keeps the
     moments table from needing to scroll as early as it otherwise would. */
  :global(.sequence-block) {
    padding: 0.75rem 0 0.9rem;
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
    align-items: baseline;
    gap: 0.6rem;
    margin-bottom: 0.6rem;
    padding: 0 0.9rem;
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

  .merge-select {
    width: auto;
    max-width: 11rem;
    font-size: 0.8rem;
    padding: 0.3rem 0.4rem;
  }

  .actions {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
</style>
