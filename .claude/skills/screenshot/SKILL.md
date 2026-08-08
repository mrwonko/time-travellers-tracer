---
name: screenshot
description: Take a screenshot of a running page (this app's dev server, or any URL) via Playwright, with console-error and failed-request reporting, and an optional bounded sequence of click/fill/press actions first. Use this instead of writing a fresh ad hoc .mjs Playwright script each time — it's a fixed, parameterized tool so it can be permanently allowed rather than approved per invocation.
---

# Screenshot

Use the bundled script rather than writing a new verification script each
time:

```
node .claude/skills/screenshot/screenshot.mjs --url <url> --out <path.png> [options]
```

Options:
- `--width N` / `--height N` — viewport size (default 1280x900)
- `--wait-for <selector>` — wait for a selector (e.g. `text=Events`) right
  after navigation, before any actions run
- `--selector <selector>` — screenshot just one element instead of the
  whole page
- `--no-full-page` — capture only the viewport instead of the full
  scrollable page
- `--stub-no-random-uuid` — deletes `window.crypto.randomUUID` before page
  scripts run, to reproduce the insecure-context/LAN-IP phone bug (see
  `src/lib/id.ts`) deterministically instead of trusting the theory

Actions — repeatable, executed **in the order given on the command line**,
after navigation/`--wait-for` and before the final screenshot:
- `--click <selector>`
- `--fill '<selector>::<value>'`
- `--press '<selector>::<Key>'` (e.g. `'input.field::Enter'`)
- `--wait-after <selector>` — wait for a selector to appear mid-sequence
  (e.g. after a click reveals something)
- `--resize <W>x<H>` — resize the viewport mid-test, e.g. to simulate a
  mobile on-screen keyboard shrinking available vertical space

Selectors are Playwright selectors (CSS, or `text=...`, `role=...`, etc.).

Prints a JSON summary (`consoleErrors`, `failedRequests`) to stdout after
saving the image — check that before assuming a screenshot "looks right"
is actually right; a page can render its shell while something underneath
threw or 404'd.

Example — add a universe and confirm it shows up:
```
node .claude/skills/screenshot/screenshot.mjs \
  --url "http://localhost:8080/#/editor" --wait-for "text=Universes" \
  --fill 'input[placeholder="New universe label…"]::Backup' \
  --click 'button[aria-label="Add universe"]' \
  --wait-after 'text=Backup' \
  --out /tmp/after-add.png
```

Requires the dev server already running (see the `dev-server` skill) if
the URL is local. Requires `playwright` installed (already a
devDependency here) and its browser binaries downloaded (`npx playwright
install chromium` — already done in this environment).

Save output paths under the session scratchpad or another temp location,
not into the repo.
