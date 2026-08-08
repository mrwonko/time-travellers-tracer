# Visual Design Language

Status: direction confirmed (2026-08-08). Concrete values below (exact
hexes, exact font, chamfer sizing) are a starting point, not final — revisit
once the first real editor screens exist to look at.

## Mood / references

- **Marathon** (2025) — bold geometric HUD type, high contrast, bright
  accent colors against dark/light grounds, angular cut corners.
- **House of X / Powers of X** (2019 comics, graphic design by Tom Muller)
  — infographic-heavy page design: technical schematics, timelines,
  evolutionary/data diagrams rendered as in-story artifacts, sparse
  monospace labels. Especially relevant here since those pages are
  literally doing what our future graph view needs to do — turning
  branching timeline/lineage data into a legible diagram.
- **Narkina 5 prison** (*Andor*) — stark white, clinical, brutalist
  geometry, high-contrast lighting, a single saturated color (the
  jumpsuits) popping against white/gray.

Common thread across all three: geometric/angular forms (not rounded), flat
high-contrast surfaces (no soft shadows/gradients), saturated accent color
used sparingly and functionally rather than decoratively, and a
technical/instrument-panel typographic register.

## Typography

- **Geometric sans** (e.g. Space Grotesk or similar) for UI chrome, labels,
  headings — technical but legible, not a display/logo font.
- **Monospace** for anything data-shaped: IDs, order indices, predecessor
  lists, raw/JSON-ish content. This visually distinguishes *authored story
  content* from *structural data* at a glance.

## Color

- Base pair: near-black ink (around `#0a0a0a`, not pure black) on
  paper-white (around `#f5f5f2`, not pure white) — the stark two-tone
  contrast from Narkina 5 / House of X-Powers of X.
- Built as design tokens from the start, covering both a light theme
  (default — this is a productivity tool, used in daylight) and a dark
  theme (closer to Marathon's HUD-on-dark feel) from the same token set.
- One **primary saturated accent**, used sparingly, for focus states,
  primary actions, and "this is live/selected": leaning **amber/orange**
  (echoes the prison-jumpsuit pop-of-color-on-white, also reads as a
  warning-light/HUD accent).
- One **secondary saturated accent** for informational/secondary state:
  **electric cyan**.
- A wider set of saturated hues is reserved, unused elsewhere in the
  editor, specifically for future per-universe/branch coloring in the graph
  view (spec §8 open question 8) — so the palette scales into that later
  without a redesign.

## Shape

- Sharp corners by default (`border-radius: 0`).
- A recurring **chamfered/cut-corner** motif (angled corner via
  `clip-path`) on key containers/panels as the signature geometric detail —
  cheap to produce, distinctive, consistent with all three references.
- Flat layering: hairline 1px borders and background-tone shifts for depth,
  not shadows or blur.

## Motion — split by surface

- **Editor (data-entry) surfaces**: near-zero motion budget. Instant
  feedback on typing/focus/list edits; at most a fast (~100ms) flash for
  save confirmation. No spinners/skeleton loaders unless genuinely waiting
  on I/O (rare, since persistence is local — see spec §10).
- **Graph/visualization surfaces** (later phase, spec §7): a real animation
  budget — eased position transitions when the reference observer swaps and
  the Y-axis recomputes, hover glow/highlight, click-to-focus. This split is
  a standing principle, stated now so it doesn't drift once the graph phase
  starts.

## Interaction principles

- **Keyboard-first**: full keyboard navigability — tab order, arrow-key
  list traversal, shortcuts for common actions (e.g. new event, link
  predecessor). A command palette would fit the aesthetic well later; not
  required for MVP.
- **Mobile-safe**: keyboard-first must not become keyboard-only or
  hover-only. No hover-revealed-only actions; real touch hit-target sizing
  even within a dense, information-heavy layout.
