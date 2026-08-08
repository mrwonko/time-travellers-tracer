<script lang="ts">
  import Icon, { type IconName } from '../lib/Icon.svelte';
  import IconButton from '../lib/IconButton.svelte';
  import UuidTag from '../lib/UuidTag.svelte';
  import DirectionToggle from '../lib/DirectionToggle.svelte';
  import DirectionBadge from '../lib/DirectionBadge.svelte';
  import CollapsiblePanel from '../lib/CollapsiblePanel.svelte';
  import UndoToast from '../lib/UndoToast.svelte';
  import MultiSelectCombobox from '../lib/MultiSelectCombobox.svelte';

  const iconNames: IconName[] = ['plus', 'edit', 'x', 'save', 'chevron'];

  let demoDirection = $state<'forward' | 'inverted'>('forward');

  let showUndoDemo = $state(false);
  function triggerUndoDemo() {
    showUndoDemo = true;
  }

  const comboboxOptions = [
    { id: '1', label: 'Signal received at the depot' },
    { id: '2', label: 'Handoff at the overpass' },
    { id: '3', label: 'Depot burns' },
    { id: '4', label: 'Return to the alley' },
  ];
  let comboboxSelected = $state<string[]>([]);

  let panelDemoCollapsed = $state(false);
</script>

<div class="page">
  <header class="bar">
    <div class="wordmark">
      <span class="mark chamfer-sm" aria-hidden="true"></span>
      <span class="wordmark-text">TIME TRAVELLER'S TRACER</span>
    </div>
    <span class="tag mono">COMPONENT LIBRARY &middot; REFERENCE ONLY</span>
  </header>

  <main>
    <section class="swatch chamfer-bordered">
      <h2>Icon</h2>
      <p class="note">Six names, deliberately kept small. Square caps/miter joins, not round — matches the sharp-corner design language. Always <code>aria-hidden</code>; the accessible name lives on the enclosing button.</p>
      <div class="icon-row">
        {#each iconNames as name (name)}
          <div class="icon-sample">
            <Icon {name} size={20} />
            <span class="mono">{name}</span>
          </div>
        {/each}
      </div>
    </section>

    <section class="swatch chamfer-bordered">
      <h2>IconButton</h2>
      <p class="note">Accessible name via <code>aria-label</code> (not <code>alt</code> — that's <code>&lt;img&gt;</code>-only). Solid amber by default — every editor action button uses this, no separate "primary" color needed. Delete is distinguished from Edit only by the "x" glyph and its label — no danger/red color, since the palette reserves wider hues for future per-universe graph coloring. "ghost" stays available for lower-emphasis cases, not currently used in the editor itself.</p>
      <div class="button-row">
        <IconButton icon="plus" label="Add" onclick={() => {}} />
        <IconButton icon="edit" label="Edit" onclick={() => {}} />
        <IconButton icon="x" label="Delete" onclick={() => {}} />
        <IconButton icon="save" label="Save" onclick={() => {}} />
        <IconButton icon="save" label="Ghost example" variant="ghost" onclick={() => {}} />
        <IconButton icon="x" label="Disabled" onclick={() => {}} disabled />
        <IconButton icon="edit" label="Small" size="sm" onclick={() => {}} />
      </div>
    </section>

    <section class="swatch chamfer-bordered">
      <h2>UuidTag</h2>
      <p class="note">Collapsed behind a tap-to-reveal toggle below 860px viewport width; always visible above it. Both states shown here regardless of your current viewport, via the <code>initialRevealed</code> prop (added for this page — zero behavior change at existing call sites, which never pass it).</p>
      <div class="button-row">
        <UuidTag id="8f14e45f-ceea-467e-bd7c-2d7a05a58d38" />
        <UuidTag id="c1a6b2d0-9e3f-4a1b-8c7d-6f5e4d3c2b1a" initialRevealed={true} />
      </div>
    </section>

    <section class="swatch chamfer-bordered">
      <h2>DirectionToggle</h2>
      <p class="note">Bindable <code>direction</code>. Currently: <span class="mono">{demoDirection}</span></p>
      <DirectionToggle bind:direction={demoDirection} />
    </section>

    <section class="swatch chamfer-bordered">
      <h2>DirectionBadge</h2>
      <p class="note">Read-only counterpart to DirectionToggle — used in the observers view instead of the full "FORWARD"/"INVERTED" words, since space there is limited. Same color pairing as the toggle's active state: amber for forward, cyan for inverted.</p>
      <div class="button-row">
        <DirectionBadge direction="forward" />
        <DirectionBadge direction="inverted" />
      </div>
    </section>

    <section class="swatch chamfer-bordered">
      <h2>CollapsiblePanel</h2>
      <p class="note">Chamfered chrome + collapse, reused by every editor list panel. Grid layouts should set <code>align-items: start</code> on the container, or collapsing one panel won't visibly free space for its sibling — see Editor.svelte.</p>
      <CollapsiblePanel title="Example panel" count={3} bind:collapsed={panelDemoCollapsed}>
        <p>Panel content goes here. Collapsed: <span class="mono">{panelDemoCollapsed}</span></p>
      </CollapsiblePanel>
    </section>

    <section class="swatch chamfer-bordered">
      <h2>UndoToast</h2>
      <p class="note">Pairs with instant, no-confirmation deletes across the editor. Auto-dismisses after 6s by default. The undo action is colored text, not an icon — reads more clearly as "undo" than a small arrow glyph would at this size.</p>
      <button type="button" class="field demo-trigger" onclick={triggerUndoDemo}>Simulate a delete</button>
      {#if showUndoDemo}
        <UndoToast
          message={'Deleted "Example row"'}
          onUndo={() => (showUndoDemo = false)}
          onDismiss={() => (showUndoDemo = false)}
        />
      {/if}
    </section>

    <section class="swatch chamfer-bordered">
      <h2>MultiSelectCombobox</h2>
      <p class="note">
        Generic over <code>&#123; id, label &#125;</code> options. Trigger matches the height of a normal <code>.field</code> input. Uses the native <code>popover</code> attribute + CSS anchor positioning, not a hand-rolled portal/dismiss — it renders in the browser's top layer (escaping <code>clip-path</code> on the chamfered panels for free) and gets outside-click/tap light-dismiss and Escape-to-close from the browser. FIXME: that light-dismiss still closes on a drag that stays entirely outside the popover (e.g. dragging the page to scroll it into view) — only drags that cross the popover itself are confirmed safe. Above/below flip is also a TODO — it always opens below the trigger for now.
      </p>
      <MultiSelectCombobox options={comboboxOptions} bind:selected={comboboxSelected} placeholder="Select events…" />
      <p class="note">
        Selected: <span class="mono">{comboboxSelected.length === 0 ? 'none' : comboboxSelected.map((id) => comboboxOptions.find((o) => o.id === id)?.label).join(', ')}</span>
      </p>
    </section>
  </main>
</div>

<style>
  .page {
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
    max-width: 56rem;
  }

  .swatch {
    padding: clamp(1rem, 2vw, 1.5rem);
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  .swatch h2 {
    font-size: 1.05rem;
  }

  .note {
    opacity: 0.75;
    font-size: 0.9rem;
    max-width: 42rem;
  }

  .note code {
    background: var(--color-bg);
    border: var(--border-width) solid var(--color-border);
    padding: 0.05rem 0.3rem;
    font-size: 0.85em;
  }

  .icon-row,
  .button-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
  }

  .icon-sample {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    min-width: 4rem;
  }

  .icon-sample span {
    font-size: 0.7rem;
    opacity: 0.6;
  }

  .demo-trigger {
    width: max-content;
    cursor: pointer;
  }
</style>
