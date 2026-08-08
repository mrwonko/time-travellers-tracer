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

Routes are hash-based (`svelte-spa-router`) — the `#` is required:
- `/#/` — landing page
- `/#/editor` — the story editor
- `/#/components` — component library showcase (deliberately unlinked
  from the app itself; direct URL only)

To stop the server: `lsof -ti:8080 -sTCP:LISTEN | xargs -r kill`.
