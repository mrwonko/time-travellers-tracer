# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

**Phase 1 in progress** (spec §11): the story editor, no chart yet. So far:
Vite+Svelte+TS scaffold exists, hash-based routing is wired up
(`svelte-spa-router`, currently just the `/` route), and the landing page
(`src/routes/Landing.svelte`) establishes the visual design language. The
actual `Story` authoring UI (events/observers/universes/moments CRUD +
`localStorage` persistence) is **not built yet** — that's the next slice of
Phase 1. Don't build graph-rendering code before that.

## Commands

Requires the Node version pinned in `.nvmrc` (current Vite needs Node
`^20.19.0 || >=22.12.0`) — run `nvm use` if you have `nvm`.

```sh
npm install
npm run dev       # dev server with HMR, http://localhost:5173
npm run build     # production build (static output to dist/)
npm run preview   # serve the production build locally
npm run check     # type-check: svelte-check + tsc, no separate lint script
```

No test suite yet (deliberately deferred — see memory on Playwright
testing plan: add real tests once there's meaningful editor functionality,
not for the landing page alone).

Fonts (Space Grotesk, JetBrains Mono) are self-hosted via `@fontsource/*`
packages, not loaded from Google Fonts or any other CDN — this was an
explicit privacy call (avoid exposing users to third-party tracking via
external asset domains), not a performance one. Keep this pattern for any
future assets: bundle locally when the license allows, don't add new
third-party-domain requests without checking in first.

Tech stack **is decided** (spec §10): Svelte + TypeScript, built with Vite;
SVG for the chart (not Canvas, for the later graph phase); small D3
submodules (`d3-scale`, `d3-shape`, `d3-array`) for layout math only, not
full D3 or `d3-selection`; `svelte-spa-router` with hash-based URLs for
client-side routing (chosen over SvelteKit to avoid its file-based routing
conventions — hash URLs also need no static-host fallback config for
deeplinks). Frontend only, no backend — static deliverable, but must be
served over `http://` (not opened via `file://`) since the app relies on
`localStorage`.

**Visual design** (`design-language.md`, full detail there): geometric,
high-contrast, retro-futuristic (references: Marathon (2025), House of
X/Powers of X comics (design by Tom Muller), and *Andor*'s Narkina 5
prison) — near-black ink on paper-white base tokens (light default, dark
theme available), sharp corners with a
chamfered-corner motif, amber primary / cyan secondary saturated accents,
flat hairline-border layering (no shadows/gradients). Motion is split by
surface: **near-zero motion in editor/data-entry UI** (snappy, keyboard-first,
no animations blocking input) vs. a real animation budget reserved for the
later graph view (position transitions, hover/click effects). This
direction is confirmed but not yet tuned against real screens.

## What this project is

An interactive web visualization for time-travel stories with closed loops
(and possibly branching/merging timelines). It renders, per character
("observer"), their personal/subjective order of experienced events — even
when that order jumps around non-monotonically — and shows visually when
different observers share an event ("meet").

`time-travel-viz-spec.md` is the authoritative design document — read it in
full before implementing. The core model, summarized:

- **Event**: atomic thing that happens; has `predecessors` (causal "caused
  by" edges). The predecessor graph **may contain cycles** — a cycle alone
  isn't a paradox (see satisfiability, spec §5.2).
- **Observer**: a character with an ordered `sequence` of **Moments**. This
  order is the observer's own subjective experienced order — there is
  deliberately **no absolute/global timestamp** anywhere in the model.
- **Moment**: a set of event IDs (usually 1) an observer experiences
  together, plus a `direction` (`forward`/`inverted`) for Tenet-style
  entropy-inverted traversal.
- **`participants(event)`** is *derived*, not stored — computed by scanning
  every observer's moments for a given event ID. Shared event ID across
  observers is the *only* mechanism for representing co-presence/meetings.
  Multiplicity matters: an observer can witness the same event twice and
  should appear twice in participant lists, not be deduplicated.
- A "background/world timeline" is **not a special concept** — if needed,
  model it as an ordinary `Observer` (spec §6), not a field on `Event`.
- Every **Event** carries a mandatory `universe: UniverseID` (UUID). Fork
  and merge points are *derived* (spec §4), not stored: a fork is an event
  whose successors span more than one universe, a merge is an event whose
  predecessors span more than one universe. `universe` is mandatory (not
  defaulted) specifically to keep independently-authored `Story` documents
  safely mergeable later — see spec §3, §10.
- `EventID`/`ObserverID`/`UniverseID`/`MomentID` are all UUIDs, for the same
  reason: the `Story` document is expected to be forked and later
  reconciled between independent edits, and positional array addressing
  doesn't survive that. This "document fork/merge" concept is unrelated to
  the in-narrative Universe fork/merge above — same word, different layer.
  `participants()` returns `moment.id`, not positional index (spec §4).
- The persisted/exported unit is a `Story { events, observers, universes }`
  document (spec §3) — autosaved to `localStorage`, with explicit JSON
  export/import for backup and sharing (spec §10).

Two graphs must not be conflated (spec §5.1): the causal predecessor graph
("what caused what," may be cyclic) stays independent of the derived
branch/universe topology described above — the predecessor graph itself
carries no branching-specific structure.

The intended visualization (spec §7, decided direction) is a subway-map
style chart: one lane per observer (X axis), Y position derived from a
user-selectable reference observer's own monotonic sequence, shared events
drawn as cross-lane connectors, and an observer's own next-step order shown
via directed arrows within their lane (since a jump can move opposite to the
reference observer's Y order). Alternatives considered but not chosen:
circular/radial layout, presence matrix, dual synced scrubbers.

Spec §8 lists remaining open questions (event content model for
paradox-checking, lane ordering to minimize crossings, connector rendering
style, default reference observer, inverted-segment visuals, and how the
chart should visually render universe/fork/merge boundaries). Branching
topology and tech stack are resolved (§10 above). Treat the rest as live
design decisions, not gaps to silently fill in.
