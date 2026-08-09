---
name: check
description: Type-check the project via svelte-check (make check). Use this instead of re-typing the npx svelte-check command each time.
---

# Check

```
make check
```

Runs `svelte-check` against `tsconfig.app.json`. Fixed, parameterless
command — safe to always-allow rather than approving the raw `npx`
invocation each time.
