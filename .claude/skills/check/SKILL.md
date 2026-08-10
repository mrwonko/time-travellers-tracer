---
name: check
description: Type-check the project via svelte-check + tsc (make check). Use this instead of re-typing the npx svelte-check/tsc commands each time.
---

# Check

```
make check
```

Runs `svelte-check` against `tsconfig.app.json` (the Svelte app), then
`tsc -p tsconfig.node.json` (Node-context files outside the app bundle —
`vite.config.ts`, and the type-checked `.claude/skills/` scripts, e.g.
`seed-story.mjs`'s `// @ts-check` pragma keeping its fixture in sync with
`src/lib/types.ts`) — matching `package.json`'s own `check` script
exactly, so this is the one command that actually covers everything
`npm run check` does. Fixed, parameterless command — safe to always-allow
rather than approving the raw `npx` invocations each time.
