---
name: session-retro
description: Look back over the session just completed for learnings worth saving to memory and repeated/effortful tasks worth turning into a skill. Run this proactively whenever a chunk of real work wraps up — a task is done, a PR round is addressed, a feature lands — not just when the user explicitly asks for a retro. Always present findings and ask before writing a new skill file; never build one as a silent side effect.
---

# Session retro

A habit, not a one-off command: whenever the session's current goal has
actually been achieved — a task completed, a review round addressed, a
feature landed — pause before moving on (or ending) and look back over
what just happened. This is diagnostic. It surfaces candidates; it does
not act on them by itself.

Not for every small exchange — running this after each individual tool
call or minor back-and-forth is noise, not signal. It's for real
checkpoints: the kind of moment where you'd naturally say "okay, that's
done."

## Process

1. **Scan the session's arc.** Look back over what was actually done:
   which tasks were completed, which commands or tool sequences got
   invoked — especially anything invoked more than once, or anything that
   needed an improvised one-off script instead of a reusable one. A
   throwaway script written fresh to do something that also came up
   earlier in the same session is a strong signal.

2. **Separate automation candidates from noise.** For each recurring or
   effortful step, weigh:
   - Did it recur (even just twice) this session, or is it plausible it
     recurs in future sessions on this project?
   - Was it fiddly or error-prone to get right by hand — the kind of
     thing that's easy to subtly mess up under time pressure (multi-step
     API calls, escaping, ad hoc filtering logic)? Getting it wrong once
     during the session is itself evidence, not just a hypothetical.
   - Is it already covered by an existing skill or standing instruction
     (CLAUDE.md, system prompt, an existing memory)? If so, it's not a
     new-skill candidate — at most, an existing skill needs refining.
   - Was it a genuine one-off investigation (chasing a specific bug,
     one specific piece of exploratory debugging) with no reason to
     expect it recurs in that exact shape? That's not a skill candidate
     even if it took real effort — effort alone isn't the bar,
     *recurrence* is.

3. **Separately, surface memory-worthy learnings — and don't default them
   all to local memory.** Look for: corrections the user gave, non-obvious
   approaches that were confirmed as correct, new project facts or
   context that came up, technical gotchas discovered the hard way (a
   tooling bug, a footgun in a dependency, a non-obvious constraint).

   For each, ask where it actually belongs before reflexively saving it
   to the local memory system:
   - Personal collaboration-style feedback (how this user likes to work,
     communication preferences) — local memory (feedback/user type) is
     the right place; it's appropriately private to this user/agent
     pairing.
   - Anything that matters to the *codebase itself* — a convention a
     human contributor would also need to know, a gotcha that would bite
     anyone editing this code, a documented decision — belongs committed
     into the repo (CLAUDE.md, a code comment, a doc file), not only in
     local memory. Local memory is invisible to other contributors, to
     this same repo checked out elsewhere, and to any future session that
     isn't specifically this user on this machine. If it's worth
     remembering, it's usually worth more than one copy: memory for quick
     recall in future sessions, repo for everyone/everywhere else.
   - When in doubt, do both rather than picking one.

4. **Present findings before acting.** List each automation candidate
   with a short description: what it would do, and what recurring
   pain/risk it removes. Do this even for a candidate that seems
   obviously worth building. **Do not create a new skill file without the
   user confirming they want it** — a retro's job is to surface options,
   not to decide for them. This applies regardless of how confident the
   recommendation is.

5. **If asked to build one,** follow this project's existing skill
   conventions (see `.claude/skills/*/SKILL.md` for examples): narrow and
   single-purpose, a `SKILL.md` with frontmatter whose `description`
   states plainly when to use it, and — if it wraps a repeatable
   command — a small fixed script instead of leaving future sessions to
   improvise a one-off each time. Test it end-to-end against something
   real (not just a syntax check) before calling it done — if the skill
   talks to a live system (an API, a running server), exercise that real
   path at least once rather than trusting the code by inspection alone.

## What this is not

- Not a substitute for the memory system, and not a reason to treat local
  memory as the only place a finding needs to live — this skill just
  prompts you to look for findings and route each one (memory, repo, or
  both) at the right moment.
- Not an excuse to build tooling preemptively. A candidate that only
  happened once this session, with no clear sign it'll happen again,
  stays a note, not a skill.
- Not something to run silently — always surface findings to the user in
  a short summary, even when the answer is "nothing worth automating this
  time."
