# Closed-Loop Time Travel Visualization — Spec

## 1. Goal

Build an interactive chart for a time-travel story with a closed loop (and
possibly branching/merging alternate timelines). The chart should show, for
each character (observer):

- their **personal/subjective order** of experienced events, even when that
  order jumps around non-monotonically relative to any "background" order;
- when **different observers share an event** ("meet"), visually — e.g. their
  lines touch/connect at that point.

This document specifies the underlying data model first, then the intended
visualization approach, then open questions to resolve before/during
implementation. It's self-contained — no other context should be needed.

## 2. Core concepts

- **Event** — an atomic thing that happens. Has an identity, optionally a
  human-readable label/content, and a set of causal **predecessors** (other
  events that caused it). Events do **not** store who witnessed them —
  that's derived (see §4).
- **Predecessor graph** — the graph formed by every event's `predecessors`
  edges. This is the "what caused what" relation. **It is allowed to contain
  cycles** (e.g. a bootstrap paradox: a future event is the cause of a past
  event which is the cause of that future event). A cycle is not itself a
  problem — see §5 on satisfiability.
- **Observer** — a character (or, optionally, the "world"/background
  timeline treated as just another observer — see §6). Has an ordered
  sequence of **moments**.
- **Moment** — one step in an observer's personal experience. A moment is a
  *set* of event IDs (usually one, but can be more than one to represent
  events the observer experiences as simultaneous). A moment also has a
  **direction** relative to the predecessor graph (see §5.3, Tenet-style
  inversion).

Note there is deliberately **no absolute/global timestamp anywhere** in the
model. Only relative structure (predecessor edges, and each observer's own
step order) matters for the chart.

## 3. Data model

Concrete schema (tech stack: see §10):

```
Story {                         // the root document — what gets persisted
                                 // and exported/imported (§10)
  events: Event[]
  observers: Observer[]
  universes: Universe[]
}

Event {
  id: EventID                   // UUID
  label?: string                // optional flavor text, not used by algorithms
  predecessors: EventID[]       // "caused by" edges; may form cycles
  universe: UniverseID          // UUID; mandatory — see below and §10
}

Observer {
  id: ObserverID                // UUID
  name?: string
  sequence: Moment[]            // ordered — this order IS the observer's
                                 // personal/subjective experienced order
}

Moment {
  id: MomentID                  // UUID
  events: EventID[]             // usually length 1; >1 = experienced as
                                 // simultaneous by this observer
  direction: "forward" | "inverted"   // see §5.3
}

Universe {
  id: UniverseID                 // UUID
  label?: string
}
```

`EventID`, `ObserverID`, `UniverseID`, and `MomentID` are all UUIDs. The
reason isn't (only) that they're referenced by ID from elsewhere — it's that
the `Story` document itself (§10) is expected to be **forked and later
reconciled**: two people (or one person on two branches) independently
editing copies of the same `Story`, then merging their edits back together.
Positional addressing (array index) doesn't survive that — if one fork
inserts a moment mid-sequence and the other reorders the same sequence, indices
no longer line up, and a merge tool can't tell "same moment, edited" from
"unrelated new moment" without a stable ID. This applies just as much to
`Moment` (an element of `Observer.sequence`) as to the top-level entities,
which is why it gets an `id` too, not just positional `momentIndex`
addressing.

*Terminology note*: this "fork a `Story`, reconcile later" concept is
**unrelated** to the in-narrative Universe fork/merge concept in §4 — same
English word, two different layers (document edit-history vs. story
content). A single-universe story can still be authored collaboratively and
need document-level fork/merge; a single-author story can still have many
in-narrative universes. Don't conflate them.

**`universe` is mandatory, not optional/defaultable.** A single-timeline
story just gives every event the same `UniverseID`. The reason it isn't an
implicit/omittable default: the UUID + mandatory-universe combination is
what keeps the door open to later importing and merging `Story` documents
authored independently by different people (§10) — an *implicit* shared
default universe would silently glue two separately-authored untagged
event sets into one universe on merge, fabricating meetings/merge-points
that were never intended. Requiring an explicit `UniverseID` (itself a UUID,
so two authors' universes can never accidentally collide either) avoids that
trap even though it's some upfront busywork for the common non-branching
case.

Important properties of this model:

- `direction` is not an intrinsic property of a moment in isolation — it
  describes the traversal *into* that moment from the previous one in the
  observer's sequence (i.e. it's really a property of the step/edge between
  consecutive moments, just encoded on the later endpoint for convenience).
  A moment's `direction` is meaningless without the moment before it; the
  first moment in a sequence has no incoming step, so its `direction` value
  is unconstrained/ignored. See §5.3 for how this is used.
- The **same EventID can appear more than once** across an observer's
  sequence (an observer can witness the same event twice — e.g. watching
  their own past/future self). This is just a repeat in the list; no special
  field needed.
- Different observers reference the same `EventID` to represent that they
  were both present — this is the *only* way co-presence is represented.

## 4. Derived queries

**`participants(event)`** — who witnessed a given event. Not stored;
computed by scanning all observers' moments for that event ID:

```
participants(e) = [
  (observer, moment.id)
  for observer in allObservers
  for moment in observer.sequence
  if e in moment.events
]
```

Returns `moment.id`, not positional index — the index is fragile under
document forking/reconciliation (see §3), while the moment's own ID stays
stable. Positional order within a sequence, when actually needed (e.g. for
rendering), is always trivially derivable by locating that `moment.id`
within its observer's `sequence` array.

This must account for multiplicity: if one observer's sequence references
the same event twice, that observer should appear twice in the result (as
two separate `(observer, moment.id)` entries, one per distinct `Moment`),
not be deduplicated.

A "meeting" between observers is simply any event where `participants(e)`
includes more than one distinct observer (or the same observer more than
once, for a self-encounter).

**Fork/merge points** — like `participants()`, derived by cross-referencing
`predecessors` against `universe`, not stored as their own graph (§5.1,
§10):

- A **fork point** is an event `E` whose direct successors (events listing
  `E` in their `predecessors`) span more than one distinct `universe`.
- A **merge point** is an event `E` whose own `predecessors` span more than
  one distinct `universe`.

There's no structural distinction between a "full merge" and a partial
causal bleed between timelines — both are just an edge crossing universes;
it's a narrative reading of the same fact, not a data-level one.

## 5. Causality, cycles, and self-consistency

### 5.1 Two distinct graphs — do not conflate

- **Predecessor graph** (§2): "what caused what." May be cyclic. Used for
  paradox/satisfiability checking (§5.2) and for validating observer
  traversal order (§5.3).
- **Branching/merging timeline topology** — resolved (§3, §4): every `Event`
  carries a mandatory `universe` tag, and fork/merge points are *derived* by
  finding where the predecessor graph's edges cross `universe` boundaries.
  The predecessor graph itself is unchanged by this — it still means only
  "what caused what" — so the two concerns stay independent as required
  here, without needing a second stored graph.

### 5.2 Cycles vs. paradoxes

A cycle in the predecessor graph is not automatically a paradox. The
relevant distinction is **satisfiability**, not cyclicity:

- *Bootstrap-loop case* ("I am my own grandpa"): the cycle is
  self-consistent — there exists an assignment of event content across the
  cycle where every predecessor edge's requirement is simultaneously
  satisfied. This is allowed on a single timeline; no fork needed.
- *Paradox case* ("I kill my own grandpa"): no consistent assignment of
  content exists — different edges into the same event demand contradictory
  content. This is what actually requires a fork (or should be disallowed),
  not the mere presence of a cycle.

**Suggested algorithm** (not yet implemented — content model is an open
question, §8):

1. Find strongly-connected components (SCCs) of the predecessor graph.
2. For each nontrivial SCC, compose the content-constraint functions around
   the cycle into a single function `f`.
3. The cycle is self-consistent iff `f` has a fixed point (`f(x) = x` for
   some valid content `x`).

This check is independent of any branching/fork topology (§5.1) and
independent of observer traversal direction (§5.3).

### 5.3 Inverted causality (Tenet-style)

Some observers may traverse a stretch of the predecessor graph in reverse
(their subjective forward time runs opposite to the predecessor-edge
direction for that stretch — e.g. entropy-inverted characters).

This requires **no change to `Event` or the predecessor graph**. It's
captured entirely by the `direction` field on `Moment` (§3), which — per the
note in §3 — governs the *step into* that moment from the previous one:

- `"forward"` step: the moment being stepped into must be consistent with
  predecessor order relative to the previous moment — never witness an
  effect-moment before all the cause-moments it depends on.
- `"inverted"` step: the requirement is reversed for that step — the
  observer walks from effect toward cause.

Consecutive `direction` values need not match — an observer can flip
mid-sequence (e.g. forward, forward, inverted, inverted, forward), and each
step's own `direction` is checked independently against the step before it.

Two observers (one forward, one inverted) can still validly share a moment
at the same event — this uses the same shared-event mechanism as any other
meeting (§4); direction doesn't affect whether a meeting can happen, only
how each observer got there and will leave.

## 6. The "background timeline" is just another observer

There is no privileged global/absolute order in the model. If a canonical
reference ordering is useful for the chart (e.g. a stable default Y-axis),
it should be represented as an ordinary `Observer` (e.g. `id: "world"`)
whose sequence happens to be a full forward linearization of everything —
not as a special field on `Event`. Any observer can be chosen as the chart's
reference axis, not just this one.

## 7. Visualization approach (decided direction)

**Layout**: subway-map style.
- X axis: one lane per observer (categorical, not time-scaled).
- Y axis: position derived from a *chosen* observer's moment sequence (this
  observer's own order is, by construction, monotonic — see §6). This
  observer can be swapped interactively.
- A shared event across two or more observers' lanes is drawn as a
  horizontal connector at that Y position — lanes "touch" there, directly
  representing a meeting.
- Personal order within a lane is shown via directed, numbered/colored
  arrows connecting an observer's own moments in sequence (not via
  geometric position, since a jump can move opposite to the reference
  observer's order). Arrow direction should visually flip for `"inverted"`
  segments (§5.3).
- Self-loops (same observer witnessing the same event twice) render as a
  loop back into the same lane rather than a cross-lane connector.
- Spacing should be **schematic** (order-based, like a real subway map),
  not proportional to any real time gap — the model has no timestamps to be
  proportional to anyway.

**Alternative approaches considered** (kept for reference / possible later
exploration, not the primary direction):
- Circular/radial layout — absolute order mapped to angle instead of a
  line; thematically fits a closed loop since the loop literally closes.
  Multiple loop iterations could extrude into a spiral.
- Presence matrix — rows = events in some reference order, columns =
  observers, filled cell = that observer's step index. Scales better with
  many observers; loses the "path" feel.
- Dual synced scrubber UI — one timeline scrubbing a reference order, one
  strip per observer scrubbing their personal order, cross-linked.

## 8. Open questions (intentionally left open)

1. ~~**Branching/merging timeline topology.**~~ **RESOLVED** — see §3, §4,
   §5.1: mandatory `universe: UniverseID` on `Event`; fork/merge points are
   derived, not a separate stored graph. Still open, and deferred to the
   viz-design pass: how the chart should *render* universe boundaries
   (separate lane groups? color per universe? something else?) — see new
   item 8 below.
2. **Event content model.** What does "content" of an event actually consist
   of, and how are per-edge constraints on content represented and
   evaluated? Needed to actually implement the satisfiability/paradox check
   in §5.2 — currently only sketched conceptually.
3. **Lane ordering / layout algorithm.** How to order/assign observer lanes
   to minimize connector crossings (borrow from DAG/commit-graph layout or
   Hasse-diagram literature?).
4. **Connector rendering.** Curved Bezier vs. orthogonal ("subway-style"
   right-angle) jump connectors.
5. **Default reference observer.** Which observer (if any) is selected by
   default for the Y axis, and how does the UI let the user switch it?
6. **Inverted-segment rendering details.** Exact visual treatment for
   direction flips and for forward/inverted meetings.
7. ~~**Tech stack.**~~ **RESOLVED** — see §10.
8. **Universe rendering.** *(new)* How should the subway-map chart visually
   indicate universe boundaries and fork/merge points, now that they're
   defined (§4)? E.g. color-per-universe, separate lane groupings, explicit
   fork/merge glyphs at those events. Not yet decided.

## 9. Non-goals for this pass

- Real GR-style closed timelike curves / global self-consistency solving
  (Novikov as a fixed point over the *entire* loop) — out of scope; this
  spec targets self-consistent single-loop stories, not general relativity.
- Real-time collaborative editing, server-side/backend persistence, and
  live multi-author merging are out of scope for this pass. Local browser
  persistence and file-based import/export *are* in scope — see §10; the
  mandatory-UUID/mandatory-universe design keeps the door open for a future
  multi-author merge feature, but the merge logic/UI itself is not being
  built now.

## 10. Implementation decisions (resolved)

**Deliverable shape**: frontend-only, static files, no backend — this
repository ships as a folder that can be built (`vite build`) and hosted
anywhere static (or run locally). It must be *served* over `http://`
(`vite preview`, `npx serve`, GitHub Pages, etc.) rather than opened
directly via `file://` — `localStorage` behaves inconsistently across
browsers under the `file://` origin (e.g. Chrome effectively shares one
storage bucket across all local files opened this way), so a trivial static
server is required even though there's no real backend.

**Tech stack**:
- **Svelte + TypeScript**, built with **Vite**. Chosen over React for a
  smaller dependency footprint and no virtual-DOM runtime; Svelte compiles
  away at build time. Chosen over no framework at all because the app needs
  nontrivial UI state (observer/universe selection, scrubbing) that's
  tedious to hand-roll.
- **SVG**, not Canvas, for the chart itself — each element is a real DOM
  node, so hover/click/CSS-transition interactivity is native and doesn't
  require manual hit-testing.
- For layout math (Y-axis scale, connector curve generation), pull in only
  small **D3 submodules** (`d3-scale`, `d3-shape`, `d3-array`) rather than
  the full `d3` bundle — Svelte owns the DOM and animation, so `d3-selection`
  / `d3-transition` aren't needed.

**Routing**: the app is a single-page app with client-side routing via
**`svelte-spa-router`**, using its default **hash-based** URLs (`#/...`).
Chosen over SvelteKit specifically to avoid SvelteKit's file-based routing
conventions (folder-per-route, `+page.svelte`/`+layout.svelte` naming),
which felt too rigid for this app's size. Hash-based URLs mean deeplinks
and refresh/new-tab state-recreation work on *any* static host with zero
server-side fallback/rewrite configuration — the `#...` fragment never
reaches the server, so there's nothing to configure. It's still a real SPA:
navigation is client-side only (no full page reload), so in-memory state —
the loaded `Story` and any derived indices built from it (`participants()`,
fork/merge points, and later the satisfiability/layout computations) —
persists across navigation between the editor and the future graph view,
which was the motivating requirement (§9, §11).

**Persistence & data portability**: the `Story` document (§3) is
autosaved to `localStorage` as it's edited, plus explicit **JSON
export/import** for backup and sharing between people. This is the reason
`EventID`/`ObserverID`/`UniverseID` are UUIDs and `Event.universe` is
mandatory rather than an implicit default (§3) — it keeps two independently
authored `Story` documents safely combinable later (a real merge
feature/UI is *not* being built now — see §9 — but the identifiers won't
need to change when it is).

## 11. MVP phasing

**Phase 1 (current target): the story editor, no chart.** Author and edit a
full `Story` (events with predecessors/universe, observers, moments
including `direction`) through a UI, with persistence (§10). The subway-map
visualization (§7) and everything downstream of it (lane layout, connector
rendering, universe-rendering open question §8 item 8) is explicitly **not**
part of this phase — it's the next one, once the editor exists.

**Visual design language** for the editor (and, later, the graph) is
decided separately in `design-language.md` — geometric/high-contrast/
retro-futuristic direction (Marathon, House of X/Powers of X comics, and
Andor's Narkina 5 as references), near-zero motion in the editor vs. a
real animation budget in
the future graph view. Treat it as a confirmed direction, not yet tuned
against real screens — revisit once Phase 1 has actual pages to look at.
