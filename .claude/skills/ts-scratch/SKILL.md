---
name: ts-scratch
description: Type-check a standalone TypeScript snippet against an isolated, strict tsconfig with access to this repo's real node_modules (so imports like `zod` resolve). Use this instead of hand-building a throwaway `.ts` file + `tsconfig.json` in `/tmp` and running `tsc` by hand each time a type-system question needs answering.
---

# ts-scratch

Use the bundled, executable script rather than hand-building a scratch dir:

```
echo "import { z } from 'zod'; const s = z.string(); type T = z.infer<typeof s>;" \
  | .claude/skills/ts-scratch/ts-scratch.mjs
```

Piping via stdin (heredoc for multi-line snippets) avoids shell-quoting pain
for the first run of a snippet.

## Iterating on a snippet

The snippet persists at `/tmp/ts-scratch/snippet.ts` between runs — for a
second or third pass on the same snippet, `Edit` that file directly and
rerun with no arguments to recheck, instead of re-piping the whole thing
through a heredoc again:

```
.claude/skills/ts-scratch/ts-scratch.mjs
```

## Options

- `--file <path>` — read the snippet from an existing file instead of stdin.
- `--clean` — delete the scratch dir and exit.
- `--help` / `-h` — usage.

## Output

No JSON wrapper — prints `tsc`'s own diagnostic text as-is (it's already
directly actionable: `file(line,col): error TSxxxx: ...`), and exits with
`tsc`'s own exit code (`0` = no type errors), so you can branch on pass/fail
without parsing anything.

## Example — multi-line snippet via heredoc, deliberate type error

```
.claude/skills/ts-scratch/ts-scratch.mjs <<'EOF'
import { z } from 'zod';

const schema = z.object({ name: z.string(), age: z.number() });
type Person = z.infer<typeof schema>;

const p: Person = { name: 'Ford', age: 'forty-two' };
EOF
```

```
/tmp/ts-scratch/snippet.ts(6,35): error TS2322: Type 'string' is not assignable to type 'number'.
```

Exit code is `2` here, mirroring `tsc`'s own exit code.

## How it works, and why the scratch dir lives in `/tmp`

The snippet is written to `/tmp/ts-scratch/snippet.ts` alongside a fresh,
isolated `tsconfig.json` (`strict`, `noEmit`, `types: []`, no `extends` of
this project's own configs) — in system `/tmp`, not inside the repo, since
the repo checkout may not be writable (e.g. a read-only or sandboxed
checkout). The dir persists across runs rather than being deleted after
each one, so a snippet can be edited and rechecked iteratively (see above).

`tsc` resolves bare specifiers like `zod` by walking *up* from the source
file looking for `node_modules`. Since the scratch dir lives outside the
repo tree, that walk wouldn't normally reach this project's real
`node_modules` — so the script symlinks `node_modules` directly into the
scratch dir on every run, which the walk finds immediately without needing
to leave `/tmp` at all. Real dependencies resolve without any path
configuration, and nothing is ever written into the repo proper.

Run `--clean` to remove the scratch dir once you're done with a snippet;
it isn't required (a stale snippet is just overwritten by the next
non-empty stdin/`--file` run), but is there for hygiene.
