# Knihobot Seller Estimator — Multi-Agent Build

An applicant demo for the Knihobot full-stack role. It answers the question a
hesitant seller asks before they ever ship a box: **"What are my books actually
worth, and what will I really get paid?"** — the moment Knihobot's own investors
identified as where most sellers drop off.

Two AI agents build it. You (Peter) conduct.

---

## The cast

- **Gemini = the Developer.** Writes the code, one task at a time. Standing
  instructions live in [`GEMINI.md`](./GEMINI.md).
- **Claude Code = the Reviewer.** Reviews every change before it's accepted.
  Standing instructions live in [`CLAUDE.md`](./CLAUDE.md).
- **You = the Conductor.** Relay reports between them, make the product calls,
  do the merges.

## Source of truth (both agents read these)

- [`docs/SPEC.md`](./docs/SPEC.md) — what we're building and why. Includes the
  four **Trust Principles** that are product law.
- [`docs/TASKS.md`](./docs/TASKS.md) — the backlog and the live status board.
  This file is the baton.

## Intended repo layout

```
knihobot-estimator/
├── README.md          # this file (for you)
├── GEMINI.md          # auto-loaded by Gemini CLI — Developer instructions
├── CLAUDE.md          # auto-loaded by Claude Code — Reviewer instructions
└── docs/
    ├── SPEC.md        # product + technical spec
    └── TASKS.md       # backlog + status board
```

`GEMINI.md` and `CLAUDE.md` sit at the repo root on purpose — both CLIs
auto-load a root-level context file, so each agent picks up its own brief
without you pasting it every time.

---

## The loop (one task at a time)

```
        ┌─────────────────────────────────────────────────────┐
        │                                                     │
        ▼                                                     │
  [1] You: "Gemini, start the next TODO task."                │
        │                                                     │
        ▼                                                     │
  [2] Gemini implements on a task branch, commits,            │
      sets the task to IN REVIEW, returns a HANDOFF REPORT.   │
        │                                                     │
        ▼                                                     │
  [3] You: "Claude, review branch task/T<id>-…"               │
        │                                                     │
        ▼                                                     │
  [4] Claude reviews the git diff, returns a REVIEW VERDICT.  │
        │                                                     │
        ├── APPROVE ──► you merge + mark DONE ────────────────┘
        │
        └── CHANGES REQUESTED ──► relay findings to Gemini,
                                  who fixes and re-hands-off ──► back to [3]
```

You are only ever moving **two short text blocks**: Gemini's Handoff Report and
Claude's Review Verdict. The code itself travels through git, which Claude reads
directly via `git diff`.

---

## Kickoff prompts (paste these once per session)

**To Gemini (the Developer):**

```
Read GEMINI.md, docs/SPEC.md, and docs/TASKS.md in full before doing anything.
You are the Developer. Confirm you understand the project, the four Trust
Principles, and the workflow, then start the top task with status TODO in
docs/TASKS.md. Implement only that one task. When done, follow the handoff
procedure in GEMINI.md and stop for review.
```

**To Claude Code (the Reviewer):**

```
Read CLAUDE.md, docs/SPEC.md, and docs/TASKS.md in full before doing anything.
You are the Reviewer, not the author — do not write the implementation. When I
name a task, review the change on its branch (git diff against main) plus the
Developer's Handoff Report, and return a Review Verdict in the format defined in
CLAUDE.md.
```

---

## How you relay (copy-paste snippets)

**From Gemini → Claude.** After Gemini hands off, tell Claude:

```
Review task T<id>. The branch is task/T<id>-<slug>. Here is the Developer's
Handoff Report:

<paste Gemini's Handoff Report>
```

**From Claude → Gemini.** After Claude returns CHANGES REQUESTED:

```
The Reviewer requested changes on task T<id>. Address every blocking finding,
and the non-blocking ones if cheap. Here is the Review Verdict:

<paste Claude's Review Verdict>
```

**On APPROVE.** Merge the branch, then tell Gemini:

```
The Reviewer approved task T<id>. Mark it DONE in docs/TASKS.md. Wait — don't
start the next task until I say go.
```

---

## Rules of the road

- **Backend and deployment are deliberately undecided.** No Vercel, no hosting,
  no cloud database yet. Everything runs locally via `next dev`. All data access
  goes behind a `CatalogRepository` interface (see SPEC) so the store can be
  chosen later. If an agent thinks a backend decision is needed, it must stop
  and ask you — not pick one silently.
- **Small tasks, small diffs.** If a task feels big, split it before starting.
- **Claude can say DONE; Gemini cannot.** Only an approved review flips a task to
  DONE. This keeps the developer honest.
- **The Trust Principles win ties.** When polish and honesty conflict, honesty
  wins — that honesty _is_ the product.

## The 90-second pitch this produces

When it's live: a Loom where you say _"Knihobot's loudest seller complaint is
that you commit blind and get surprised by the payout. I read the reviews,
designed a fix, and shipped it — here's a tool that tells you what your books
are worth and what you'll actually receive, before you send a thing."_ That's
the end-to-end-ownership story the role is asking for.
