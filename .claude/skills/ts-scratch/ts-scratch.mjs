#!/usr/bin/env node
// @ts-check
// Type-checks a standalone TypeScript snippet against an isolated, strict
// tsconfig — replaces hand-building a throwaway .ts file + tsconfig.json in
// /tmp and running tsc by hand each time a type-system question needs
// answering. The scratch dir is created as a sibling of this script (inside
// the repo), not in system /tmp: tsc resolves bare specifiers like `zod` by
// walking up from the source file looking for node_modules, so the scratch
// dir has to stay inside the repo tree for that walk to reach the project's
// real node_modules. Everything (write, run, read) happens inside a
// try/finally so cleanup always runs, even on a thrown error or non-zero
// tsc exit — no manual rm -rf step for the caller.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function usage() {
  return [
    'Usage:',
    '  .claude/skills/ts-scratch/ts-scratch.mjs [--file <path>]',
    '  <snippet piped via stdin> | .claude/skills/ts-scratch/ts-scratch.mjs',
    '',
    'Type-checks a TypeScript snippet against an isolated, strict tsconfig',
    '(strict, noEmit, types: []) with access to this repo\'s real',
    'node_modules (e.g. zod resolves normally).',
    '',
    'Options:',
    '  --file <path>   read the snippet from this file instead of stdin',
    '  --help, -h      show this message',
    '',
    'No JSON wrapper: prints tsc\'s own diagnostic output as-is, and exits',
    'with tsc\'s own exit code (0 = no type errors).',
    '',
    'Example:',
    "  echo \"import { z } from 'zod'; const s = z.string();\" \\",
    '    | .claude/skills/ts-scratch/ts-scratch.mjs',
  ].join('\n');
}

/** @param {string[]} argv */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') args.file = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
  }
  return args;
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(usage());
  process.exit(0);
}

const snippet = args.file ? fs.readFileSync(args.file, 'utf8') : readStdin();

if (!snippet.trim()) {
  console.error(usage());
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const tmpRoot = path.join(scriptDir, '.tmp');
fs.mkdirSync(tmpRoot, { recursive: true });
const dir = fs.mkdtempSync(path.join(tmpRoot, 'run-'));

// status is read after the try/finally, not exited from inside it —
// process.exit() terminates immediately and would skip the finally block,
// leaving the scratch dir behind.
let status = 1;
try {
  fs.writeFileSync(path.join(dir, 'snippet.ts'), snippet);
  fs.writeFileSync(
    path.join(dir, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'es2023',
          lib: ['ES2023'],
          module: 'nodenext',
          moduleResolution: 'nodenext',
          strict: true,
          noEmit: true,
          skipLibCheck: true,
          types: [],
          esModuleInterop: true,
          forceConsistentCasingInFileNames: true,
        },
        files: ['snippet.ts'],
      },
      null,
      2,
    ),
  );

  const result = spawnSync('npx', ['tsc', '-p', dir], {
    cwd: scriptDir,
    stdio: 'inherit',
  });

  status = result.status ?? 1;
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
process.exit(status);
