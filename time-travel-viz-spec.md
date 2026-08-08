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

Illustrative schema (language/stack not prescribed — see Open Questions):

```
Event {
  id: EventID
  label?: string                // optional flavor text, not used by algorithms
  predecessors: EventID[]       // "caused by" edges; may form cycles
}

Observer {
  id: ObserverID
  name?: string
  sequence: Moment[]            // ordered — this order IS the observer's
                                 // personal/subjective experienced order
}

Moment {
  events: EventID[]             // usually length 1; >1 = experienced as
                                 // simultaneous by this observer
  direction: "forward" | "inverted"   // see §5.3
}
```

Important properties of this model:

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
  (observer, momentIndex)
  for observer in allObservers
  for momentIndex, moment in observer.sequence
  if e in moment.events
]
```

This must account for multiplicity: if one observer's sequence references
the same event twice, that observer should appear twice in the result (as
two separate `(observer, momentIndex)` entries), not be deduplicated.

A "meeting" between observers is simply any event where `participants(e)`
includes more than one distinct observer (or the same observer more than
once, for a self-encounter).

## 5. Causality, cycles, and self-consistency

### 5.1 Two distinct graphs — do not conflate

- **Predecessor graph** (§2): "what caused what." May be cyclic. Used for
  paradox/satisfiability checking (§5.2) and for validating observer
  traversal order (§5.3).
- Whether/how a **branching or merging timeline topology** (parallel
  universes forking and possibly rejoining) is represented is a **separate,
  currently unresolved** concern — see Open Questions §8. Do not assume the
  predecessor graph doubles as a branch-topology graph; they may need to be
  independent structures.

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
captured entirely by the `direction` field on `Moment` (§3):

- `"forward"` segment: the observer's moment order must be consistent with
  predecessor order — never witness an effect-moment before all the
  cause-moments it depends on.
- `"inverted"` segment: the requirement is reversed for that stretch — the
  observer walks from effect toward cause.

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

1. **Branching/merging timeline topology.** How do parallel-universe forks
   and merges interact with the predecessor-graph + observer model? Does
   this need a separate branch/universe-id structure, or can it be encoded
   entirely through the predecessor graph and observer traversal? (See
   §5.1.)
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
7. **Tech stack.** Not prescribed in this document — implementer's choice,
   to be confirmed.

## 9. Non-goals for this pass

- Real GR-style closed timelike curves / global self-consistency solving
  (Novikov as a fixed point over the *entire* loop) — out of scope; this
  spec targets self-consistent single-loop stories, not general relativity.
- Real-time collaborative editing, persistence layer, etc. — not addressed
  here.
