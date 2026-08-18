#!/usr/bin/env bash
# Fixed, reviewable script for reading and replying to GitHub PR review
# comment threads — see SKILL.md for the reasoning. Two subcommands:
#
#   pr-comments.sh list <PR> [--all]
#   pr-comments.sh reply <PR> <root-comment-id> <body-file> \
#       --co-author "Name <email>" --session-url <url> [--dry-run]
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  pr-comments.sh list <PR> [--all]
      List review comment threads, newest activity last. By default only
      unresolved threads are shown (a resolved thread means nothing is
      left to do). Pass --all to include resolved threads too.

  pr-comments.sh reply <PR> <root-comment-id> <body-file> \
      --co-author "Name <email>" --session-url <url> [--dry-run]
      Reply to a thread. <root-comment-id> is the numeric id printed by
      `list` (the id after `reply-to=`) — always the thread's first
      comment, since GitHub threads replies under that id regardless of
      which comment in the thread they're actually answering.
      Automatically appends a Co-Authored-By + Claude-Session trailer to
      the body (same convention as commits), so replies are identifiable
      as Claude's even though they post under the human user's own GitHub
      account. Both flags are required for exactly that reason. --dry-run
      prints the final request body instead of sending it.
EOF
}

repo_owner_name() {
  gh repo view --json owner,name --jq '.owner.login + " " + .name'
}

READ_QUERY='
query($owner: String!, $name: String!, $number: Int!) {
  repository(owner: $owner, name: $name) {
    pullRequest(number: $number) {
      reviewThreads(first: 100) {
        pageInfo { hasNextPage }
        nodes {
          isResolved
          path
          line
          originalLine
          comments(first: 100) {
            pageInfo { hasNextPage }
            nodes {
              databaseId
              body
              createdAt
              url
            }
          }
        }
      }
    }
  }
}
'

cmd_list() {
  local pr="${1:-}"
  if [[ -z "$pr" ]]; then
    echo "error: PR number required" >&2
    usage >&2
    exit 1
  fi
  shift
  local show_all=false
  if [[ "${1:-}" == "--all" ]]; then show_all=true; fi

  local owner name
  read -r owner name <<< "$(repo_owner_name)"

  local data
  data=$(gh api graphql -f query="$READ_QUERY" -f owner="$owner" -f name="$name" -F number="$pr")

  local has_next
  has_next=$(jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage' <<< "$data")
  if [[ "$has_next" == "true" ]]; then
    echo "warning: 100+ review threads exist; some may be omitted (pagination not implemented)" >&2
  fi

  local comments_has_next
  comments_has_next=$(jq -r '[.data.repository.pullRequest.reviewThreads.nodes[].comments.pageInfo.hasNextPage] | any' <<< "$data")
  if [[ "$comments_has_next" == "true" ]]; then
    echo "warning: at least one thread has 100+ comments; some may be omitted (pagination not implemented)" >&2
  fi

  jq -r --argjson showAll "$show_all" '
    .data.repository.pullRequest.reviewThreads.nodes
    | map(select($showAll or (.isResolved | not)))
    | sort_by(.comments.nodes[-1].createdAt)
    | if length == 0 then
        (if $showAll then "No review threads." else "No unresolved threads — nothing left to do. Pass --all to see resolved ones too." end)
      else
        .[]
        | . as $t
        | ($t.comments.nodes[0].databaseId) as $root
        | (if $t.isResolved then "RESOLVED" else "OPEN" end) as $status
        | "=== \($t.path):\($t.line // $t.originalLine // "?")  [\($status)]  reply-to=\($root) ===",
          ( $t.comments.nodes[]
            | (if (.body | test("Co-Authored-By:.*Claude"; "i")) then "[you]" else "[reviewer]" end) as $who
            | "  \($who) \(.createdAt)  id=\(.databaseId)\n    " + (.body | gsub("\r"; "") | gsub("\n"; "\n    "))
          ),
          ""
      end
  ' <<< "$data"
}

cmd_reply() {
  local pr="${1:-}" comment_id="${2:-}" body_file="${3:-}"
  if [[ -z "$pr" || -z "$comment_id" || -z "$body_file" ]]; then
    echo "error: PR number, comment id, and body file are all required" >&2
    usage >&2
    exit 1
  fi
  shift 3

  local co_author="" session_url="" dry_run=false
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --co-author) co_author="$2"; shift 2 ;;
      --session-url) session_url="$2"; shift 2 ;;
      --dry-run) dry_run=true; shift ;;
      *) echo "unknown flag: $1" >&2; exit 1 ;;
    esac
  done
  if [[ -z "$co_author" || -z "$session_url" ]]; then
    echo "error: --co-author and --session-url are both required, so the reply is identifiable as Claude's (see SKILL.md)" >&2
    exit 1
  fi
  if [[ ! -f "$body_file" ]]; then
    echo "error: body file not found: $body_file" >&2
    exit 1
  fi

  local body
  body="$(cat "$body_file")

Co-Authored-By: $co_author
Claude-Session: $session_url"

  if [[ "$dry_run" == true ]]; then
    echo "--- dry run: would POST to comments/$comment_id/replies ---"
    echo "$body"
    return 0
  fi

  local owner name
  read -r owner name <<< "$(repo_owner_name)"

  gh api "repos/$owner/$name/pulls/$pr/comments/$comment_id/replies" -f body="$body" --silent
  echo "Replied to comment $comment_id"
}

main() {
  local sub="${1:-}"
  if [[ -z "$sub" ]]; then usage; exit 1; fi
  shift
  case "$sub" in
    list) cmd_list "$@" ;;
    reply) cmd_reply "$@" ;;
    -h|--help) usage ;;
    *) echo "unknown subcommand: $sub" >&2; usage >&2; exit 1 ;;
  esac
}

main "$@"
