#!/usr/bin/env node
// @ts-check
// Type-checks a standalone TypeScript snippet against an isolated, strict
// tsconfig — replaces hand-building a throwaway .ts file + tsconfig.json in
// /tmp and running tsc by hand each time a type-system question needs
// answering. The scratch dir lives in system /tmp (not inside the repo,
// which may not be writable, e.g. a read-only checkout) and persists across
// runs. Bootstrapping the dir and running the actual check are decoupled so
// the Bash invocation is always the same fixed, argument-less command
// (approvable once instead of every time): write the snippet straight to
// the persisted path with the Write/Edit tool, then rerun this script with
// no arguments. Piping a snippet via stdin/--file still works but makes
// the shell command's text different on every call, which defeats
// allow-listing it — prefer the Write-tool flow for anything beyond a
// single quick check. tsc resolves bare specifiers like `zod` by walking
// up from the source file looking for node_modules; a symlink to this
// repo's real node_modules is placed directly inside the scratch dir so
// that walk finds it immediately, without the scratch dir needing to be
// inside the repo tree.

import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';

const SCRATCH_DIR = path.join(os.tmpdir(), 'ts-scratch');
const SNIPPET_PATH = path.join(SCRATCH_DIR, 'snippet.ts');

function usage() {
  return [
    'Usage:',
    '  .claude/skills/ts-scratch/ts-scratch.mjs [--file <path>] [--clean]',
    '  <snippet piped via stdin> | .claude/skills/ts-scratch/ts-scratch.mjs',
    '',
    'Type-checks a TypeScript snippet against an isolated, strict tsconfig',
    '(strict, noEmit, types: []) with access to this repo\'s real',
    'node_modules (e.g. zod resolves normally).',
    '',
    `Preferred flow: write the snippet to ${SNIPPET_PATH} with the`,
    'Write/Edit tool, then run this script with no arguments — that keeps',
    'the Bash command identical every time, so it can be approved once.',
    'Edit the same file and rerun to iterate.',
    '',
    'Options:',
    '  --file <path>   read the snippet from this file instead of stdin',
    '  --clean         delete the scratch dir and exit',
    '  --help, -h      show this message',
    '',
    'No JSON wrapper: prints tsc\'s own diagnostic output as-is, and exits',
    'with tsc\'s own exit code (0 = no type errors).',
  ].join('\n');
}

/** @param {string[]} argv */
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--file') args.file = argv[++i];
    else if (a === '--clean') args.clean = true;
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

if (args.clean) {
  fs.rmSync(SCRATCH_DIR, { recursive: true, force: true });
  process.exit(0);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(scriptDir, '..', '..', '..');

// Bootstrapping (dir + node_modules symlink) always happens, independent of
// whether this call also supplies a snippet, so a plain no-args run is a
// valid — and idempotent — first call that just gets the scratch dir ready
// for the Write tool to target.
fs.mkdirSync(SCRATCH_DIR, { recursive: true });

// Relinked every run (cheap) so a stale/missing link never lingers.
const nodeModulesLink = path.join(SCRATCH_DIR, 'node_modules');
fs.rmSync(nodeModulesLink, { recursive: true, force: true });
fs.symlinkSync(path.join(repoRoot, 'node_modules'), nodeModulesLink, 'dir');

const snippet = args.file ? fs.readFileSync(args.file, 'utf8') : readStdin();
if (snippet.trim()) {
  fs.writeFileSync(SNIPPET_PATH, snippet);
}

if (!fs.existsSync(SNIPPET_PATH)) {
  console.log(`Scratch dir ready. Write your snippet to ${SNIPPET_PATH}, then rerun with no arguments.`);
  process.exit(1);
}

fs.writeFileSync(
  path.join(SCRATCH_DIR, 'tsconfig.json'),
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

const result = spawnSync('npx', ['tsc', '-p', SCRATCH_DIR], {
  cwd: scriptDir,
  stdio: 'inherit',
});

process.exit(result.status ?? 1);
