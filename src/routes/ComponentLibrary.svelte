<script lang="ts">
  import Icon, { type IconName } from '../lib/Icon.svelte';
  import IconButton from '../lib/IconButton.svelte';
  import UuidTag from '../lib/UuidTag.svelte';
  import DirectionToggle from '../lib/DirectionToggle.svelte';
  import DirectionBadge from '../lib/DirectionBadge.svelte';
  import CollapsiblePanel from '../lib/CollapsiblePanel.svelte';
  import MultiSelectCombobox from '../lib/MultiSelectCombobox.svelte';
  import ChamferBox from '../lib/ChamferBox.svelte';
  import PageHeader from '../lib/PageHeader.svelte';
  import { pushUndo } from '../lib/toastQueue.svelte';

  const iconNames: IconName[] = ['plus', 'edit', 'x', 'save', 'chevron'];

  let demoDirection = $state<'forward' | 'inverted'>('forward');

  function triggerUndoDemo() {
    pushUndo('Deleted "Example row"', () => {});
  }

  const comboboxOptions = [
    { id: '1', label: 'Signal received at the depot' },
    { id: '2', label: 'Handoff at the overpass' },
    { id: '3', label: 'Depot burns' },
    { id: '4', label: 'Return to the alley' },
  ];
  let comboboxSelected = $state<string[]>([]);

  let panelDemoOpen = $state(true);
</script>

<div class="page">
  <PageHeader tag="COMPONENT LIBRARY &middot; REFERENCE ONLY" />

  <main>
    <ChamferBox tag="section" class="complib-swatch">
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
    </ChamferBox>

    <ChamferBox tag="section" class="complib-swatch">
      <h2>IconButton</h2>
      <p class="note">Accessible name via <code>aria-label</code> (not <code>alt</code> — that's <code>&lt;img&gt;</code>-only). Solid amber by default — every editor action button uses this, no separate "primary" color needed. Delete is distinguished from Edit only by the "x" glyph and its label — no danger/red color, since the palette reserves wider hues for future per-timeline graph coloring. "ghost" stays available for lower-emphasis cases, not currently used in the editor itself.</p>
      <div class="button-row">
        <IconButton icon="plus" label="Add" onclick={() => {}} />
        <IconButton icon="edit" label="Edit" onclick={() => {}} />
        <IconButton icon="x" label="Delete" onclick={() => {}} />
        <IconButton icon="save" label="Save" onclick={() => {}} />
        <IconButton icon="save" label="Ghost example" variant="ghost" onclick={() => {}} />
        <IconButton icon="x" label="Disabled" onclick={() => {}} disabled />
        <IconButton icon="edit" label="Small" size="sm" onclick={() => {}} />
      </div>
    </ChamferBox>

    <ChamferBox tag="section" class="complib-swatch">
      <h2>UuidTag</h2>
      <p class="note">Collapsed behind a tap-to-reveal toggle below 860px viewport width; always visible above it. Both states shown here regardless of your current viewport, via the <code>initialRevealed</code> prop (added for this page — zero behavior change at existing call sites, which never pass it).</p>
      <div class="button-row">
        <UuidTag id="8f14e45f-ceea-467e-bd7c-2d7a05a58d38" />
        <UuidTag id="c1a6b2d0-9e3f-4a1b-8c7d-6f5e4d3c2b1a" initialRevealed={true} />
      </div>
    </ChamferBox>

    <ChamferBox tag="section" class="complib-swatch">
      <h2>DirectionToggle</h2>
      <p class="note">Bindable <code>direction</code>. Currently: <span class="mono">{demoDirection}</span></p>
      <DirectionToggle bind:direction={demoDirection} />
    </ChamferBox>

    <ChamferBox tag="section" class="complib-swatch">
      <h2>DirectionBadge</h2>
      <p class="note">Read-only counterpart to DirectionToggle — used in the observers view instead of the full "FORWARD"/"INVERTED" words, since space there is limited. Same color pairing as the toggle's active state: amber for forward, cyan for inverted.</p>
      <div class="button-row">
        <DirectionBadge direction="forward" />
        <DirectionBadge direction="inverted" />
      </div>
    </ChamferBox>

    <ChamferBox tag="section" class="complib-swatch">
      <h2>CollapsiblePanel</h2>
      <p class="note">Chamfered chrome + collapse, backed by native <code>&lt;details&gt;/&lt;summary&gt;</code> (not hand-rolled JS state) — reused by every editor list panel, including per-row in ObserverList via the <code>titleSnippet</code>/<code>actions</code> props. Grid layouts should set <code>align-items: start</code> on the container, or collapsing one panel won't visibly free space for its sibling — see Editor.svelte.</p>
      <CollapsiblePanel title="Example panel" count={3} bind:open={panelDemoOpen}>
        {#snippet actions()}
          <IconButton icon="edit" label="Edit example panel" size="sm" onclick={() => {}} />
        {/snippet}
        <p>Panel content goes here. Open: <span class="mono">{panelDemoOpen}</span></p>
      </CollapsiblePanel>
    </ChamferBox>

    <ChamferBox tag="section" class="complib-swatch">
      <h2>UndoToast</h2>
      <p class="note">Pairs with instant, no-confirmation deletes across the editor. Pushed onto a shared queue (<code>toastQueue.svelte.ts</code>) rendered by one <code>ToastHost</code> mounted globally in <code>App.svelte</code> — fixed to the bottom-left of the viewport regardless of where the triggering list sits or how far the page is scrolled, and stacked if more than one is active. Auto-dismisses after 6s by default. The undo action is colored text, not an icon — reads more clearly as "undo" than a small arrow glyph would at this size.</p>
      <button type="button" class="field demo-trigger" onclick={triggerUndoDemo}>Simulate a delete</button>
    </ChamferBox>

    <ChamferBox tag="section" class="complib-swatch">
      <h2>ChamferBox</h2>
      <p class="note">
        The one place that applies the chamfered-corner clip-path classes (defined in its own <code>&lt;style&gt;</code> block, colocated with the <code>chamferClass()</code> helper) — every other chamfered shape in the app (bordered panels, the wordmark, the CTA button) goes through this instead of applying <code>chamfer(-sm)(-bordered)</code> by hand, so the border trick's required <code>position</code>/<code>isolation</code> pairing can't be forgotten or clobbered again the way it was on <code>MultiSelectCombobox</code>'s popover.
      </p>
      <div class="chamfer-demo-row">
        <ChamferBox class="complib-chamfer-demo-box">md, bordered</ChamferBox>
        <ChamferBox size="sm" class="complib-chamfer-demo-box">sm, bordered</ChamferBox>
        <ChamferBox bordered={false} class="complib-chamfer-demo-box complib-chamfer-demo-solid">md, not bordered</ChamferBox>
        <ChamferBox size="sm" bordered={false} class="complib-chamfer-demo-box complib-chamfer-demo-solid">sm, not bordered</ChamferBox>
      </div>
    </ChamferBox>

    <ChamferBox tag="section" class="complib-swatch">
      <h2>MultiSelectCombobox</h2>
      <p class="note">
        Generic over <code>&#123; id, label &#125;</code> options. Trigger matches the height of a normal <code>.field</code> input. Uses the native <code>popover</code> attribute + CSS anchor positioning, not a hand-rolled portal/dismiss — it renders in the browser's top layer (escaping <code>clip-path</code> on the chamfered panels for free) and gets outside-click/tap light-dismiss and Escape-to-close from the browser. FIXME: that light-dismiss still closes on a drag that stays entirely outside the popover (e.g. dragging the page to scroll it into view) — only drags that cross the popover itself are confirmed safe. Opening picks whichever side (above/below the trigger) actually has more room, JS-computed (native <code>position-try: flip-block</code> didn't trigger reliably in testing) — try it on this swatch, deliberately kept as the last one on the page to exercise the "not enough room below" case.
      </p>
      <MultiSelectCombobox options={comboboxOptions} bind:selected={comboboxSelected} placeholder="Select events…" />
      <p class="note">
        Selected: <span class="mono">{comboboxSelected.length === 0 ? 'none' : comboboxSelected.map((id) => comboboxOptions.find((o) => o.id === id)?.label).join(', ')}</span>
      </p>
    </ChamferBox>
  </main>
</div>

<style>
  .page {
    width: 100%;
    min-height: 100svh;
    display: flex;
    flex-direction: column;
  }

  main {
    flex: 1;
    padding: clamp(1rem, 3vw, 3rem);
    display: flex;
    flex-direction: column;
    gap: clamp(1.25rem, 2.5vw, 2rem);
    max-width: 56rem;
  }

  /* :global() because the class is passed through to ChamferBox's own
     rendered element, not applied to an element literally present in this
     component's template — which also means it's in the page's genuinely
     global namespace, not Svelte-scoped to this file, hence the
     "complib-" prefix (a clash here wouldn't be caught at build time the
     way a scoped-selector clash would be). */
  :global(.complib-swatch) {
    padding: clamp(1rem, 2vw, 1.5rem);
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
  }

  :global(.complib-swatch) h2 {
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

  .chamfer-demo-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  :global(.complib-chamfer-demo-box) {
    padding: 1rem 1.25rem;
    font-size: 0.85rem;
  }

  :global(.complib-chamfer-demo-solid) {
    background: var(--color-accent);
    color: var(--color-ink);
  }
</style>
