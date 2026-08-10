---
name: screenshot
description: Take a screenshot of a running page (this app's dev server, or any URL) via Playwright, with console-error and failed-request reporting, and an optional bounded sequence of click/fill/press/drag/tap actions first. Use this instead of writing a fresh ad hoc .mjs Playwright script each time — it's a fixed, parameterized tool so it can be permanently allowed rather than approved per invocation.
---

# Screenshot

Use the bundled script rather than writing a new verification script each
time:

```
node .claude/skills/screenshot/screenshot.mjs --url <url> --out <path.png> [options]
```

Kept deliberately narrow — flags for one-off investigations get removed
once their job is done (see the script's own header comment) rather than
accumulating forever. If you need something not listed here, prefer a
one-off script for that specific investigation over growing this file.

Options:
- `--seed <preset>` / `--seed-file <path.json>` — seed localStorage with
  a Story before navigating (see the `seed-story` skill), instead of the
  app's empty first-run state — e.g. `--seed demo`
- `--width N` / `--height N` — viewport size (default 1280x900)
- `--wait-for <selector>` — wait for a selector (e.g. `text=Events`) right
  after navigation, before any actions run
- `--selector <selector>` — screenshot just one element instead of the
  whole page
- `--no-full-page` — capture only the viewport instead of the full
  scrollable page
- `--touch` — enable real touch input (Playwright `hasTouch` context)
  instead of mouse. Required for `--tap`/`--touch-drag` to dispatch
  genuine touch events (via CDP `Input.dispatchTouchEvent`), not mouse
  events with a touch label — needed because a native `click` only gets
  tap-vs-drag suppression for touch input, not mouse (a mouse `click`
  fires regardless of drag distance).

Actions — repeatable, executed **in the order given on the command line**,
after navigation/`--wait-for` and before the final screenshot:
- `--click <selector>` — mouse click
- `--tap <selector>` — touch tap (needs `--touch`)
- `--fill '<selector>::<value>'`
- `--press '<selector>::<Key>'` (e.g. `'input.field::Enter'`)
- `--wait-after <selector>` — wait for a selector to appear mid-sequence
  (e.g. after a click reveals something)
- `--resize <W>x<H>` — resize the viewport mid-test, e.g. to simulate a
  mobile on-screen keyboard shrinking available vertical space
- `--scroll-to <selector>` — `scrollIntoView` an element. Needed before
  `--tap`, which (unlike Playwright's `.click()`) does not auto-scroll
  the target into view.
- `--drag '<from>::<to>'` — mouse drag between two selectors (real
  pointerdown → gradual move → pointerup, so it reads as a drag/scroll
  gesture rather than a tap)
- `--touch-drag '<from>::<to>'` — real touch swipe between two selectors
  (needs `--touch`). This is what actually exercises a browser-recognized
  scroll gesture, which can fire `pointercancel` instead of `pointerup`;
  a mouse drag never does, so `--drag` can't stand in for it when that
  distinction matters.

Selectors are Playwright selectors (CSS, or `text=...`, `role=...`, etc.).
Scope selectors precisely when a page has repeated structures (e.g.
`'tr:has-text("X") button[aria-label="Y"]'` or `'.data-table >> nth=0 >>
tbody tr:nth-child(1) ...'`) — an ambiguous selector matching multiple
elements is the most common cause of a hung/timed-out action here.

Prints a JSON summary (`consoleErrors`, `failedRequests`) to stdout after
saving the image — check that before assuming a screenshot "looks right"
is actually right; a page can render its shell while something underneath
threw or 404'd.

Example — add a timeline and confirm it shows up:
```
node .claude/skills/screenshot/screenshot.mjs \
  --url "http://localhost:8080/#/editor" --wait-for "text=Timelines" \
  --fill 'input[placeholder="New timeline label…"]::Backup' \
  --click 'button[aria-label="Add timeline"]' \
  --wait-after 'text=Backup' \
  --out /tmp/after-add.png
```

Example — seed some events/observers instead of starting from the
app's empty first-run state, then check a panel's contents:
```
node .claude/skills/screenshot/screenshot.mjs \
  --url "http://localhost:8080/#/editor" --seed demo --wait-for "text=Observers" \
  --out /tmp/seeded.png
```

Example — real touch tap on an off-screen element (scroll first, `--tap`
doesn't auto-scroll like `.click()` does):
```
node .claude/skills/screenshot/screenshot.mjs \
  --url "http://localhost:8080/#/components" --touch \
  --wait-for "text=MultiSelectCombobox" \
  --scroll-to '.combobox-trigger' \
  --tap '.combobox-trigger' \
  --wait-after '.combobox-popover-host' \
  --out /tmp/combobox-open.png
```

Requires the dev server already running (see the `dev-server` skill) if
the URL is local. Requires `playwright` installed (already a
devDependency here) and its browser binaries downloaded (`npx playwright
install chromium` — already done in this environment).

Save output paths under the session scratchpad or another temp location,
not into the repo.
