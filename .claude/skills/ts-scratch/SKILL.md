---
name: ts-scratch
description: Type-check a standalone TypeScript snippet against an isolated, strict tsconfig with access to this repo's real node_modules (so imports like `zod` resolve). Use this instead of hand-building a throwaway `.ts` file + `tsconfig.json` in `/tmp` and running `tsc` by hand each time a type-system question needs answering.
---

# ts-scratch

Use the bundled, executable script — and write the snippet with the
`Write`/`Edit` tool rather than piping it through the shell. Piping means
the Bash command's literal text is different on every call (different
snippet content each time), so it can never be approved once and reused
like `dev-server`/`check` are; writing the file separately keeps the Bash
invocation identical every time, which _can_ be allow-listed.

```
.claude/skills/ts-scratch/ts-scratch.mjs
```

Run it once with no arguments first — this bootstraps `/tmp/ts-scratch`
(and a `node_modules` symlink into it) and, if `snippet.ts` doesn't exist
yet, tells you where to write it. Then:

1. `Write` (or `Edit`) the snippet to `/tmp/ts-scratch/snippet.ts`.
2. Run `.claude/skills/ts-scratch/ts-scratch.mjs` again — same fixed
   command — to type-check it.
3. To iterate, `Edit` the same file and rerun the same command.

## Options

- `--file <path>` — read the snippet from an existing file instead of
  `/tmp/ts-scratch/snippet.ts`. Rarely needed now that the Write-tool flow
  above is the default; useful mainly for checking a `.ts` file that
  already exists somewhere else.
- `--clean` — delete the scratch dir and exit.
- `--help` / `-h` — usage.

Piping via stdin (`echo "..." | .claude/skills/ts-scratch/ts-scratch.mjs`)
still works for a single one-off check where re-approving a one-time
command doesn't matter, but prefer the Write-tool flow for anything you'll
run more than once in a session.

## Output

No JSON wrapper — prints `tsc`'s own diagnostic text as-is (it's already
directly actionable: `file(line,col): error TSxxxx: ...`), and exits with
`tsc`'s own exit code (`0` = no type errors), so you can branch on pass/fail
without parsing anything.

## Example — deliberate type error

Write this to `/tmp/ts-scratch/snippet.ts`:

```ts
import { z } from 'zod';

const schema = z.object({ name: z.string(), age: z.number() });
type Person = z.infer<typeof schema>;

const p: Person = { name: 'Ford', age: 'forty-two' };
```

Then run `.claude/skills/ts-scratch/ts-scratch.mjs`:

```
/tmp/ts-scratch/snippet.ts(6,35): error TS2322: Type 'string' is not assignable to type 'number'.
```

Exit code is `2` here, mirroring `tsc`'s own exit code.

## How it works, and why the scratch dir lives in `/tmp`

The snippet lives at `/tmp/ts-scratch/snippet.ts` alongside a fresh,
isolated `tsconfig.json` (`strict`, `noEmit`, `types: []`, no `extends` of
this project's own configs) — in system `/tmp`, not inside the repo, since
the repo checkout may not be writable (e.g. a read-only or sandboxed
checkout). The dir persists across runs rather than being deleted after
each one, so a snippet can be edited and rechecked iteratively.

Bootstrapping the scratch dir and checking a snippet are deliberately
decoupled: a no-args run always (re)creates the dir and its `node_modules`
symlink first, and only then looks for something to check. That makes a
bare no-args invocation valid on its own — the first call in a session
just gets the dir ready for the Write tool to target, with no snippet
content baked into the Bash command's text.

`tsc` resolves bare specifiers like `zod` by walking *up* from the source
file looking for `node_modules`. Since the scratch dir lives outside the
repo tree, that walk wouldn't normally reach this project's real
`node_modules` — so the script symlinks `node_modules` directly into the
scratch dir on every run, which the walk finds immediately without needing
to leave `/tmp` at all. Real dependencies resolve without any path
configuration, and nothing is ever written into the repo proper.

Run `--clean` to remove the scratch dir once you're done with a snippet;
it isn't required (a stale snippet is just overwritten by the next write),
but is there for hygiene.
