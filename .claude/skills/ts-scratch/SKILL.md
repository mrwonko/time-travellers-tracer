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
and the write-then-run-then-clean-up dance that used to happen by hand in
`/tmp` — including the cleanup step itself, which this script always runs
via `try`/`finally`, even if `tsc` fails or something throws. No manual
`rm -rf` needed, and nothing is ever left behind for a later command to trip
over.

## Options

- `--file <path>` — read the snippet from an existing file instead of stdin.
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
.tmp/run-6blPow/snippet.ts(6,35): error TS2322: Type 'string' is not assignable to type 'number'.
```

Exit code is `2` here (mirrors `tsc`'s own exit code — the leading path is
the now-deleted scratch dir, harmless to ignore).

## How it works, and why the scratch dir lives inside the repo

The snippet is written to `snippet.ts` alongside a fresh, isolated
`tsconfig.json` (`strict`, `noEmit`, `types: []`, no `extends` of this
project's own configs) in a temp dir created as a **sibling of this script**
(`.claude/skills/ts-scratch/.tmp/run-<random>/`) — not system `/tmp`. `tsc`
resolves bare specifiers like `zod` by walking *up* from the source file
looking for `node_modules`; staying inside the repo tree is what lets that
walk reach this project's real `node_modules`, so real dependencies resolve
without any path configuration. Nothing persists between runs and nothing
is written into the repo proper — the temp dir is deleted after every run
(pass or fail), so there's never anything to clean up by hand.
