---
name: dev-server
description: Start (or confirm) the Vite dev server for Time Traveller's Tracer at http://localhost:8080, reachable on the LAN too (e.g. testing on a phone). Idempotent — safe to invoke even if it's already running. Use this whenever the app needs to be checked in a browser, instead of hand-writing a background-launch bash command.
---

# Dev server

Run the bundled script rather than improvising a `npm run dev &` command:

```
.claude/skills/dev-server/start.sh
```

It checks whether something is already answering on port 8080 and exits
immediately if so; otherwise it starts `npm run dev` detached in the
background (log at `.dev-server.log` in the repo root, gitignored) and
polls until the server responds, up to 30s.

Because it's one fixed, idempotent command instead of a different
hand-written bash one-liner each time, it's the thing to grant standing
("always allow") permission for, rather than approving a new inline
command on every run.

`.claude/skills/dev-server/start.sh --restart` kills whatever's already
on the port first, then starts fresh, instead of the multi-step
`lsof | xargs kill && sleep && start.sh` sequence. Reach for this before
trusting a live-browser repro that contradicts the code or test suite —
especially before concluding a failing test is pre-existing/unrelated to
current changes — if the server's been running through many edits this
session; a stale Vite/HMR module graph can make old code misbehave in
ways a fresh start won't reproduce.

Routes are hash-based (`svelte-spa-router`) — the `#` is required:
- `/#/` — landing page
- `/#/editor` — the story editor
- `/#/components` — component library showcase (deliberately unlinked
  from the app itself; direct URL only)

To stop the server: `lsof -ti:8080 -sTCP:LISTEN | xargs -r kill`.
