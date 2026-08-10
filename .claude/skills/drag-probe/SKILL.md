---
name: drag-probe
description: Start a native-HTML5 drag on this app's drag-and-drop (sequences/moments/events) and hold it hovering over one or more targets — without dropping — so mid-drag UI (insertion-line indicators, potential/hovered state) can be inspected via screenshot, className dump, or computed-style dump. Use instead of writing a fresh ad hoc Playwright script each time you need to debug how a drag *looks or behaves while in flight*, as opposed to tests/dragDrop.ts's nativeDragDrop() (used by the Playwright specs), which always completes the gesture (drop + dragend) since specs only assert on drop outcomes.
---

# Drag probe

Use the bundled script rather than writing a new investigation script:

```
node .claude/skills/drag-probe/drag-probe.mjs --url <url> --source <selector> [options]
```

Requires the dev server already running (see the `dev-server` skill) for
local URLs, and `playwright` with Chromium installed (already set up in
this repo).

## Why this exists, and why it's not `screenshot`'s `--drag`

This app's DnD (`@atlaskit/pragmatic-drag-and-drop`) is native-HTML5
drag-event based (`element.draggable = true`), not pointer-based. The
`screenshot` skill's `--drag` does a real mouse gesture
(pointerdown → move → pointerup), which doesn't reliably trigger native
HTML5 DnD under Playwright/CDP at all (confirmed by bisection — see
`tests/dragDrop.ts`'s header comment) and, even when it does, runs the
gesture to completion in one call — there's no way to pause it mid-flight
to look at anything. This script manually dispatches the same
`dragstart`/`dragenter`/`dragover` sequence `tests/dragDrop.ts` uses, but
deliberately stops before `drop`, leaving the drag hovering exactly where
you put it.

## Options

- `--seed <preset>` / `--seed-file <path.json>` — seed localStorage with
  a Story before navigating (see the `seed-story` skill), instead of the
  app's empty first-run state — e.g. `--seed demo` for the small K. Voss/
  Handler fixture used in the example below.
- `--source <selector>` — the draggable box element itself (what
  `draggable()` was registered on: this app's `[data-drag-box]` element,
  e.g. `.moment-drag-box`, `.sequence-header`, `.event-drag-box`).
- `--handle <selector>` — the grab handle inside `--source` (defaults to
  `--source` itself). `dragstart`'s coordinates come from here — this
  app's `dragHandle` action resolves `document.elementFromPoint()` at the
  dispatch coordinates and requires it to land inside the handle.
- `--hover <selector>[::x,y]` (repeatable) — dispatch `dragenter` +
  `dragover` on this target, in the order given. `x,y` are pixel offsets
  from the target's top-left corner (e.g. `::4,4` to hit its top edge,
  `::4,9999` clamped won't work — use a value close to its height for the
  bottom edge); omit for center. Each call moves "currently hovered" to
  that target before the next one runs, so a sequence of `--hover` flags
  simulates dragging across several targets in one pass.
- `--end-drag` — dispatch a final `dragend` at the last hover point (or
  at `--source` if no `--hover` was given). Only needed before starting a
  *second* drag in the same script — only one native drag can be in
  flight at a time, so a second `dragstart` without this silently no-ops.
- `--width N` / `--height N` — viewport size (default 1280x900).
- `--wait-for <selector>` — wait for a selector before starting the drag.
- `--click <selector>` (repeatable) — click before starting the drag,
  e.g. to expand a collapsed `<details>` panel (this app's observer/
  sequence panels start collapsed).

Inspection (run after all `--hover` steps):
- `--out <path.png>` + `--selector <selector>` — screenshot, same
  semantics as the `screenshot` skill (`--selector` scopes to one
  element; omit for full page; `--no-full-page` for viewport-only).
- `--dump-classes <selector>` (repeatable) — print `className` for every
  matching element, e.g. to check which `.drop-indicator-line`s picked up
  `potential`/`hovered`.
- `--computed-style '<selector>::<props>'` or
  `'<selector>::<pseudo>::<props>'` (repeatable) — dump
  `getComputedStyle()` values; `props` is a comma-separated list of
  kebab-case CSS properties (e.g. `border-top-width,border-right-width`);
  `pseudo` is `before` or `after` to inspect a `::before`/`::after` rule
  (needed for this app's shared `DropIndicatorLine`, which draws via
  `::before`).

Prints a JSON summary (`classes`, `computedStyles`, `out`) to stdout.

## Example

Drag moment 2 of 3, hover the gap between moment 1 and moment 2, and dump
which gap indicators lit up plus the actual border rendered on the one
that's hovered:

```
node .claude/skills/drag-probe/drag-probe.mjs \
  --url "http://localhost:8080/#/editor" --seed demo --wait-for "text=Observers" \
  --click 'summary:has-text("K. Voss")' \
  --source '.sequence-block >> nth=0 >> .moment-drag-box >> nth=1' \
  --handle '.sequence-block >> nth=0 >> .moment-drag-box >> nth=1 >> [aria-label="Drag to reorder moment"]' \
  --hover '.sequence-block >> nth=0 >> .moment-drag-box >> nth=0::100,60' \
  --dump-classes '.moment-gap .drop-indicator-line' \
  --computed-style '.moment-gap .drop-indicator-line.hovered::before::border-top-width,border-right-width,border-bottom-width,border-left-width'
```

Note the app's own `<details>`-based collapsible panels keep collapsed
content mounted (just hidden), which is why the `--click` above is
needed before selectors scoped inside K. Voss's panel will resolve to
the right (visible) element.

Save screenshot output paths under the session scratchpad, not into the
repo.
