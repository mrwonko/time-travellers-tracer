<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import UuidTag from '../lib/UuidTag.svelte';
  import type { StoryUniverse, StoryEvent, StoryObserver, Moment } from '../lib/types';

  // Seed data only — nothing here persists (spec §11 Phase 1, entry masks
  // before the storage layer). Small closed-loop example: Voss lives it
  // forward, the Handler lives the same stretch inverted, and they meet
  // at the handoff.
  const primeId = crypto.randomUUID();

  let universes = $state<StoryUniverse[]>([{ id: primeId, label: 'Prime' }]);

  const e1 = crypto.randomUUID();
  const e2 = crypto.randomUUID();
  const e3 = crypto.randomUUID();

  let events = $state<StoryEvent[]>([
    { id: e1, label: 'Signal received at the depot', predecessors: [], universe: primeId },
    { id: e2, label: 'Handoff at the overpass', predecessors: [e1], universe: primeId },
    { id: e3, label: 'Depot burns', predecessors: [e2], universe: primeId },
  ]);

  const seedObservers: StoryObserver[] = [
    {
      id: crypto.randomUUID(),
      name: 'K. Voss',
      sequence: [
        { id: crypto.randomUUID(), events: [e1], direction: 'forward' },
        { id: crypto.randomUUID(), events: [e2], direction: 'forward' },
        { id: crypto.randomUUID(), events: [e3], direction: 'forward' },
      ],
    },
    {
      id: crypto.randomUUID(),
      name: 'The Handler',
      sequence: [
        { id: crypto.randomUUID(), events: [e3], direction: 'inverted' },
        { id: crypto.randomUUID(), events: [e2], direction: 'inverted' },
        { id: crypto.randomUUID(), events: [e1], direction: 'inverted' },
      ],
    },
  ];
  let observers = $state<StoryObserver[]>(seedObservers);

  function eventLabel(id: string): string {
    return events.find((ev) => ev.id === id)?.label || '(untitled event)';
  }

  function universeLabel(id: string): string {
    return universes.find((u) => u.id === id)?.label || '(unlabeled universe)';
  }

  function eventsInUniverse(id: string): number {
    return events.filter((ev) => ev.universe === id).length;
  }

  // --- add-row state -------------------------------------------------
  let newUniverseLabel = $state('');
  function addUniverse() {
    if (!newUniverseLabel.trim()) return;
    universes = [...universes, { id: crypto.randomUUID(), label: newUniverseLabel.trim() }];
    newUniverseLabel = '';
  }

  let newEventLabel = $state('');
  let newEventUniverse = $state(primeId);
  let newEventPredecessors = $state<string[]>([]);
  function addEvent() {
    if (!newEventLabel.trim()) return;
    events = [
      ...events,
      {
        id: crypto.randomUUID(),
        label: newEventLabel.trim(),
        predecessors: newEventPredecessors,
        universe: newEventUniverse,
      },
    ];
    newEventLabel = '';
    newEventPredecessors = [];
  }

  let expanded = $state(new SvelteSet<string>());
  function toggleExpanded(id: string) {
    if (expanded.has(id)) expanded.delete(id);
    else expanded.add(id);
  }

  type PendingMoment = { event: string; direction: 'forward' | 'inverted' };
  let pendingMoments = $state<Record<string, PendingMoment>>(
    Object.fromEntries(seedObservers.map((o) => [o.id, { event: events[0]?.id ?? '', direction: 'forward' as const }])),
  );

  let newObserverName = $state('');
  function addObserver() {
    if (!newObserverName.trim()) return;
    const id = crypto.randomUUID();
    observers = [...observers, { id, name: newObserverName.trim(), sequence: [] }];
    pendingMoments[id] = { event: events[0]?.id ?? '', direction: 'forward' };
    newObserverName = '';
    expanded.add(id);
  }

  function addMoment(observer: StoryObserver) {
    const pending = pendingMoments[observer.id];
    if (!pending?.event) return;
    const moment: Moment = { id: crypto.randomUUID(), events: [pending.event], direction: pending.direction };
    observer.sequence = [...observer.sequence, moment];
  }
</script>

<div class="editor">
  <header class="bar">
    <div class="wordmark">
      <span class="mark chamfer-sm" aria-hidden="true"></span>
      <span class="wordmark-text">TIME TRAVELLER'S TRACER</span>
    </div>
    <span class="tag mono">EDITOR &middot; ENTRY MASKS &middot; NOT PERSISTED</span>
  </header>

  <main>
    <section class="panel chamfer-bordered">
      <header class="panel-head">
        <h2>Universes</h2>
        <span class="count mono">{universes.length}</span>
      </header>
      <table>
        <thead>
          <tr>
            <th>Label</th>
            <th>Events</th>
          </tr>
        </thead>
        <tbody>
          {#each universes as u (u.id)}
            <tr>
              <td>{u.label} <UuidTag id={u.id} /></td>
              <td class="mono">{eventsInUniverse(u.id)}</td>
            </tr>
          {/each}
          <tr class="add-row">
            <td>
              <input
                type="text"
                placeholder="New universe label…"
                bind:value={newUniverseLabel}
                onkeydown={(evt) => evt.key === 'Enter' && addUniverse()}
              />
            </td>
            <td>
              <button type="button" class="add-btn mono" onclick={addUniverse} disabled={!newUniverseLabel.trim()}>
                + ADD
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="panel chamfer-bordered">
      <header class="panel-head">
        <h2>Events</h2>
        <span class="count mono">{events.length}</span>
      </header>
      <table>
        <thead>
          <tr>
            <th>Label</th>
            <th>Universe</th>
            <th>Predecessors</th>
          </tr>
        </thead>
        <tbody>
          {#each events as ev (ev.id)}
            <tr>
              <td>{ev.label} <UuidTag id={ev.id} /></td>
              <td>{universeLabel(ev.universe)}</td>
              <td>
                {#if ev.predecessors.length === 0}
                  <span class="muted">&mdash;</span>
                {:else}
                  {ev.predecessors.map(eventLabel).join(', ')}
                {/if}
              </td>
            </tr>
          {/each}
          <tr class="add-row">
            <td>
              <input
                type="text"
                placeholder="New event label…"
                bind:value={newEventLabel}
                onkeydown={(evt) => evt.key === 'Enter' && addEvent()}
              />
            </td>
            <td>
              <select bind:value={newEventUniverse}>
                {#each universes as u (u.id)}
                  <option value={u.id}>{u.label}</option>
                {/each}
              </select>
            </td>
            <td class="predecessors-cell">
              <select multiple size="3" bind:value={newEventPredecessors}>
                {#each events as ev (ev.id)}
                  <option value={ev.id}>{ev.label}</option>
                {/each}
              </select>
              <button type="button" class="add-btn mono" onclick={addEvent} disabled={!newEventLabel.trim()}>
                + ADD
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="panel chamfer-bordered">
      <header class="panel-head">
        <h2>Observers</h2>
        <span class="count mono">{observers.length}</span>
      </header>

      <div class="observer-add">
        <input
          type="text"
          placeholder="New observer name…"
          bind:value={newObserverName}
          onkeydown={(evt) => evt.key === 'Enter' && addObserver()}
        />
        <button type="button" class="add-btn mono" onclick={addObserver} disabled={!newObserverName.trim()}>
          + ADD OBSERVER
        </button>
      </div>

      {#each observers as observer (observer.id)}
        <article class="observer-card">
          <button
            type="button"
            class="observer-head"
            onclick={() => toggleExpanded(observer.id)}
            aria-expanded={expanded.has(observer.id)}
          >
            <span class="chevron" class:open={expanded.has(observer.id)}>&#9656;</span>
            <span class="observer-name">{observer.name} <UuidTag id={observer.id} /></span>
            <span class="moment-count mono">{observer.sequence.length} moment{observer.sequence.length === 1 ? '' : 's'}</span>
          </button>

          {#if expanded.has(observer.id)}
            <div class="moments">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Event</th>
                    <th>Direction</th>
                  </tr>
                </thead>
                <tbody>
                  {#each observer.sequence as moment, i (moment.id)}
                    <tr>
                      <td class="mono">{i + 1}</td>
                      <td>{moment.events.map(eventLabel).join(' + ')} <UuidTag id={moment.id} /></td>
                      <td class="mono direction" class:inverted={moment.direction === 'inverted'}>
                        {moment.direction}
                      </td>
                    </tr>
                  {/each}
                  {#if pendingMoments[observer.id]}
                    <tr class="add-row">
                      <td></td>
                      <td>
                        <select bind:value={pendingMoments[observer.id].event}>
                          {#each events as ev (ev.id)}
                            <option value={ev.id}>{ev.label}</option>
                          {/each}
                        </select>
                      </td>
                      <td>
                        <div class="direction-toggle">
                          <button
                            type="button"
                            class:active={pendingMoments[observer.id].direction === 'forward'}
                            onclick={() => (pendingMoments[observer.id].direction = 'forward')}
                          >
                            FWD
                          </button>
                          <button
                            type="button"
                            class:active={pendingMoments[observer.id].direction === 'inverted'}
                            onclick={() => (pendingMoments[observer.id].direction = 'inverted')}
                          >
                            INV
                          </button>
                        </div>
                        <button type="button" class="add-btn mono" onclick={() => addMoment(observer)}>+ ADD</button>
                      </td>
                    </tr>
                  {/if}
                </tbody>
              </table>
            </div>
          {/if}
        </article>
      {/each}
    </section>
  </main>
</div>

<style>
  .editor {
    width: 100%;
    min-height: 100svh;
    display: flex;
    flex-direction: column;
  }

  .bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem clamp(1rem, 3vw, 3rem);
    border-bottom: var(--border-width) solid var(--color-border);
    flex-wrap: wrap;
  }

  .wordmark {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .mark {
    width: 1.1rem;
    height: 1.1rem;
    background: var(--color-accent);
    flex: none;
  }

  .wordmark-text {
    font-weight: 600;
    letter-spacing: 0.04em;
    font-size: 0.95rem;
  }

  .tag {
    font-size: 0.75rem;
    letter-spacing: 0.04em;
    opacity: 0.6;
  }

  main {
    flex: 1;
    padding: clamp(1rem, 3vw, 3rem);
    display: flex;
    flex-direction: column;
    gap: clamp(1.25rem, 2.5vw, 2rem);
  }

  .panel {
    padding: clamp(1rem, 2vw, 1.5rem);
  }

  .panel-head {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    margin-bottom: 1rem;
  }

  .panel-head h2 {
    font-size: 1.1rem;
  }

  .count {
    font-size: 0.75rem;
    opacity: 0.5;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th {
    text-align: left;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.5;
    font-weight: 500;
    padding: 0.4rem 0.6rem;
    border-bottom: var(--border-width) solid var(--color-border);
  }

  td {
    padding: 0.55rem 0.6rem;
    border-bottom: var(--border-width) solid var(--color-border);
    vertical-align: middle;
  }

  tr.add-row td {
    border-bottom: none;
    padding-top: 0.75rem;
  }

  .muted {
    opacity: 0.4;
  }

  input[type='text'],
  select {
    background: var(--color-bg);
    color: var(--color-fg);
    border: var(--border-width) solid var(--color-border-strong);
    font-family: inherit;
    font-size: 0.9rem;
    padding: 0.4rem 0.6rem;
    width: 100%;
  }

  input[type='text']:focus-visible,
  select:focus-visible,
  .add-btn:focus-visible,
  .observer-head:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 1px;
  }

  .predecessors-cell {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .add-btn {
    background: var(--color-accent);
    color: var(--color-ink);
    border: none;
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    font-weight: 600;
    padding: 0.45rem 0.7rem;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity var(--duration-fast) var(--ease-standard);
  }

  .add-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .observer-add {
    display: flex;
    gap: 0.6rem;
    margin-bottom: 1rem;
    max-width: 28rem;
  }

  .observer-card {
    border-top: var(--border-width) solid var(--color-border);
    padding-top: 0.75rem;
    margin-top: 0.75rem;
  }

  .observer-card:first-of-type {
    border-top: none;
    padding-top: 0;
    margin-top: 0;
  }

  .observer-head {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.7rem;
    background: none;
    border: none;
    color: inherit;
    font-family: inherit;
    font-size: 0.95rem;
    padding: 0.3rem 0;
    cursor: pointer;
    text-align: left;
  }

  .chevron {
    display: inline-block;
    font-size: 0.7rem;
    opacity: 0.5;
    transition: transform var(--duration-fast) var(--ease-standard);
  }

  .chevron.open {
    transform: rotate(90deg);
  }

  .observer-name {
    flex: 1;
  }

  .moment-count {
    font-size: 0.72rem;
    opacity: 0.5;
  }

  .moments {
    padding: 0.75rem 0 0.5rem 1.6rem;
  }

  .direction {
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .direction.inverted {
    color: var(--color-accent-secondary-ink);
  }

  .direction-toggle {
    display: inline-flex;
    border: var(--border-width) solid var(--color-border-strong);
    margin-right: 0.5rem;
  }

  .direction-toggle button {
    background: none;
    border: none;
    color: inherit;
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.06em;
    padding: 0.4rem 0.6rem;
    cursor: pointer;
    opacity: 0.55;
  }

  .direction-toggle button.active {
    opacity: 1;
    background: var(--color-accent);
    color: var(--color-ink);
  }

  @media (max-width: 720px) {
    .panel table,
    .panel thead,
    .panel tbody,
    .panel th,
    .panel td,
    .panel tr {
      display: block;
    }

    thead tr {
      display: none;
    }

    tbody tr:not(.add-row) {
      border-bottom: var(--border-width) solid var(--color-border);
      padding: 0.5rem 0;
    }

    td {
      border-bottom: none;
      padding: 0.2rem 0;
    }
  }
</style>
