<script lang="ts">
  import { generateId } from './id';
  import IconButton from './IconButton.svelte';

  let {
    options,
    selected = $bindable([]),
    placeholder = 'Select…',
  }: {
    options: { id: string; label: string }[];
    selected?: string[];
    placeholder?: string;
  } = $props();

  // Unique per instance — anchor-name/position-anchor is a 1:1 CSS link,
  // and a page can have several of these open at once (e.g. one editing
  // row, one add-row).
  const uid = generateId();
  const popoverId = `combobox-${uid}`;
  const anchorName = `--combobox-${uid}`;

  let open = $state(false);
  let filter = $state('');
  let filterInput: HTMLInputElement | undefined = $state();
  let popoverEl: HTMLDivElement | undefined = $state();

  let filtered = $derived(
    options.filter((o) => o.label.toLowerCase().includes(filter.toLowerCase())),
  );

  // The native `popover` attribute (not a hand-rolled open/close + portal)
  // handles: rendering in the top layer, so clip-path on the chamfered
  // panel ancestors can't clip it (unlike a plain position:fixed
  // descendant); light-dismiss on outside click/tap, correctly ignoring
  // drag/scroll gestures on *both* mouse and touch — confirmed by testing
  // real touch dispatch, not just mouse emulation, since browsers only
  // give touch its own tap-vs-scroll gesture recognition and a naive
  // `click` listener doesn't get the same treatment for mouse; and
  // Escape-to-close. None of that is reimplemented here anymore.
  function handleToggle(event: ToggleEvent) {
    open = event.newState === 'open';
    if (open) {
      filter = '';
      filterInput?.focus();
    }
  }

  function close() {
    popoverEl?.hidePopover();
  }
</script>

<button
  popovertarget={popoverId}
  type="button"
  class="field combobox-trigger"
  style="anchor-name: {anchorName}"
  aria-expanded={open}
>
  {#if selected.length === 0}
    <span class="placeholder">{placeholder}</span>
  {:else}
    <span class="mono">{selected.length} selected</span>
  {/if}
</button>

<div
  bind:this={popoverEl}
  id={popoverId}
  popover="auto"
  class="combobox-popover chamfer-sm-bordered"
  style="position-anchor: {anchorName}"
  ontoggle={handleToggle}
>
  <input
    bind:this={filterInput}
    type="text"
    class="field"
    placeholder="Filter…"
    bind:value={filter}
  />
  <ul class="combobox-options">
    {#each filtered as option (option.id)}
      <li>
        <label>
          <input type="checkbox" bind:group={selected} value={option.id} />
          {option.label}
        </label>
      </li>
    {:else}
      <li class="empty muted">No matches</li>
    {/each}
  </ul>
  <div class="combobox-footer">
    <IconButton icon="save" label="Done" variant="accent" size="sm" onclick={close} />
  </div>
</div>

<style>
  .combobox-trigger {
    text-align: left;
    cursor: pointer;
  }

  .placeholder {
    opacity: 0.5;
  }

  .combobox-popover {
    /* TODO: flips above the trigger when there isn't room below is
       postponed. CSS `position-try: flip-block` (paired with
       anchor-name/position-anchor above) is the native way to do this,
       but didn't trigger reliably in testing (Chrome 151) even with the
       anchor pushed into a viewport far too small to fit below — either
       an implementation gap in this exact form, or a syntax issue not
       found yet. For now this always opens below the trigger, capped to
       a fixed max-height with internal scroll if the option list is
       long. Revisit with a JS-computed fallback (already proven correct
       — see git history) if this turns out to matter in practice. */
    position-area: bottom span-right;
    margin: 0;
    /* The browser gives top-layer popovers a default focus outline on
       open; we already have the chamfered border for definition, and the
       filter input shows its own focus ring, so this is just noise. */
    outline: none;
    z-index: var(--z-popover);
    max-width: min(24rem, 90vw);
    min-width: anchor-size(width);
    width: max-content;
    max-height: min(60vh, 20rem);
    padding: 0.6rem;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
  }

  /* The UA stylesheet hides closed popovers via `display: none`. Setting
     `display: flex` unconditionally on .combobox-popover above would
     override that default and leave it permanently visible — scoping it
     to :popover-open is what actually keeps it hidden until shown. */
  .combobox-popover:popover-open {
    display: flex;
  }

  .combobox-options {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 12rem;
    overflow-y: auto;
    border-top: var(--border-width) solid var(--color-border);
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .combobox-options li {
    border-bottom: var(--border-width) solid var(--color-border);
  }

  .combobox-options li:last-child {
    border-bottom: none;
  }

  .combobox-options label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.3rem;
    cursor: pointer;
    min-height: 2.25rem;
  }

  .combobox-options .empty {
    padding: 0.5rem 0.3rem;
    cursor: default;
  }

  .combobox-footer {
    display: flex;
    justify-content: flex-end;
  }
</style>
