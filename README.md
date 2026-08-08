# Time Traveller's Tracer

An interactive tool for authoring and visualizing time-travel stories with
closed loops (and possibly branching/merging timelines) — tracking each
character's personal, non-linear order of experienced events, and where
different characters' lines cross.

See [`time-travel-viz-spec.md`](./time-travel-viz-spec.md) for the data
model and design decisions, [`design-language.md`](./design-language.md)
for the visual direction, and [`CLAUDE.md`](./CLAUDE.md) for a
project-status summary.

Currently in **Phase 1**: the story editor (author/edit events, observers,
universes, moments), no chart yet — see spec §11.

## Development

Requires Node (version pinned in `.nvmrc`; `nvm use` if you have `nvm`).

```sh
npm install
npm run dev       # dev server with HMR
npm run build     # production build (static output)
npm run preview   # serve the production build locally
npm run check     # type-check (svelte-check + tsc)
```

This is a frontend-only static app — no backend. The production build must
be *served* over `http://` (`npm run preview`, or any static host) rather
than opened via `file://`, since the app relies on `localStorage`.
