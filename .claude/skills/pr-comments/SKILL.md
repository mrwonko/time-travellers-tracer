---
name: pr-comments
description: List and reply to GitHub PR review comment threads, using each thread's actual resolved/unresolved status (via GraphQL) to tell what's still outstanding, and auto-tagging replies with a Co-Authored-By trailer so they're identifiable as Claude's. Use this instead of hand-rolling `gh api` + `jq` each time a PR gets review feedback to address.
---

# PR comments

Reading and replying to review comments both post under the human user's
own GitHub account — there is no separate bot login to tell "new feedback
from them" apart from "my own already-posted reply" by `author.login`
alone. This script solves that two ways: it reads each thread's real
`isResolved` state (only available via the GraphQL API, not the REST
comments endpoint), and it auto-appends a `Co-Authored-By` +
`Claude-Session` trailer to every reply it posts, mirroring the git commit
convention, so a thread's comments can be told apart on sight going
forward. Comments from before this convention existed just show up as
`[reviewer]`.

## List outstanding threads

```
.claude/skills/pr-comments/pr-comments.sh list <PR> [--all]
```

Shows unresolved threads by default — a resolved thread means there's
nothing left to do on it, so it's skipped unless `--all` is passed. Each
thread prints its file:line, resolved/open status, the numeric id to
reply to, and every comment in the thread tagged `[you]` or `[reviewer]`
(via the trailer, see above) with timestamp and body. Sorted oldest → newest
by last activity, so the most recently active threads are at the bottom,
closest to your next prompt.

Read the output and use your judgment: `[OPEN]` with the reviewer having
the last word needs a reply; `[OPEN]` with you having the last word is
just waiting on the reviewer; `[RESOLVED]` needs nothing.

## Reply to a thread

```
.claude/skills/pr-comments/pr-comments.sh reply <PR> <root-comment-id> <body-file> \
  --co-author "Claude Sonnet 5 <noreply@anthropic.com>" \
  --session-url "https://claude.ai/code/session_..." \
  [--dry-run]
```

- `<root-comment-id>` is the id printed after `reply-to=` in `list`'s
  output — always the thread's *first* comment. GitHub threads a reply
  under whichever comment id you POST to, but only the root id is
  guaranteed to land it in the same conversation regardless of how many
  replies already exist in the thread.
- `<body-file>` — write your reply to a file first (per the existing
  gh-body-via-file convention), then pass the path. Never pass the body
  inline.
- `--co-author` / `--session-url` are both required — the command refuses
  to run without them. Pull the exact values from the same place you'd
  get them for a git commit's trailer in this session (they're already in
  your context whenever you're about to commit).
- `--dry-run` prints the exact request body instead of sending it —
  use this to sanity-check a reply before it goes out, especially for a
  new/unfamiliar body-file construction.

## Requirements

Needs `gh` authenticated against the repo (same as any other `gh api`
usage in this project) and `jq`. No extra setup beyond that — it detects
`owner/repo` from the current git remote via `gh repo view`.
