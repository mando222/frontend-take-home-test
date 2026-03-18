# CopilotKit Frontend Engineering Assessment

## Context

You're receiving a ticketing application built by a previous developer. The app is functional but has bugs — some obvious, some subtle. You're also receiving a product brief with stakeholder input that contains contradictions, and a component (`REVIEW_ME.tsx`) to review.

Your job is to demonstrate engineering judgment: find and fix bugs systematically, evaluate code critically, and make defensible product decisions when requirements conflict.

**You are expected to use whatever tools you normally use**, including AI coding assistants. How you direct and evaluate automated work is part of what we're assessing.

## Scope Tiers

Tier 1 is the minimum. Higher tiers earn additional consideration in our evaluation.

### Tier 1: Core
*Sufficient to pass.*

- Fix the **3 most critical bugs** you find in the application
- Submit a written review of `src/REVIEW_ME.tsx` with severity ratings
- Submit a decision document resolving the contradictions in `BRIEF.md`
- Screen recording of your working session (5 minutes max)

### Tier 2: Extended

Everything in Tier 1, plus:

- Implement **one new feature** of your choice that demonstrates agent-directed development
- Screen recording of your working session (10 minutes max)

### Tier 3: Full

Everything in Tier 2, plus:

- Write a short technical plan for extracting this app into a shared package with a real GraphQL backend
- Extend the fake API with a new capability and demonstrate it
- Screen recording of your working session (15 minutes max)

## Deliverables

| File | What to include |
|------|----------------|
| `BUGS.md` | Bugs found with: root cause explanation, reproduction steps, your fix, and before/after test cases |
| `REVIEW.md` | Written review of `REVIEW_ME.tsx` with severity ratings for each issue found |
| `DECISIONS.md` | How you resolve each contradiction in `BRIEF.md`, with reasoning |
| Code changes | Committed to this repo |
| Screen recording | **Required for all tiers.** Show your working process — how you find bugs, how you use tools, how you make decisions. This is not a demo; it's a window into how you work. |

## Scoring

We evaluate your submission across these dimensions:

| Dimension | Weight | What we look for |
|-----------|--------|-----------------|
| Bug diagnosis quality | 25% | Root cause accuracy, systematic approach, reproduction steps |
| Code review depth | 20% | Finding real issues, severity calibration, actionable feedback |
| Decision document | 20% | Noticed contradictions, defensible tradeoffs, clear reasoning |
| Implementation quality | 15% | Correctness, edge case handling, clean code |
| Test quality | 10% | Tests cover actual risk areas, not just happy paths |
| Communication | 10% | Tradeoff clarity, self-assessment honesty, writing quality |

## Getting Started

```bash
npm install
npm run dev      # Start the dev server
npm test         # Run the test suite
npm run build    # Type-check and build
```

The app runs at `http://localhost:5173`. The fake API has randomized latency (150–1100ms) and an 8% failure rate to simulate real-world conditions. Data is stored in memory and resets on page refresh.

## What's in the repo

- `src/` — The application source code (React + TypeScript)
- `src/REVIEW_ME.tsx` — A standalone component for your code review exercise (not wired into the app)
- `BRIEF.md` — Product brief with stakeholder notes
- `src/lib/fakeApi.ts` — The fake API with configurable delay, failure rate, and AbortSignal support
- `src/lib/types.ts` — TypeScript type definitions

## Notes

- There is no time limit. The scope tiers replace time-boxing.
- The screen recording is how we see your process. Don't rehearse it — just work naturally and narrate your thinking.
- If you find more bugs than the 3 required for Tier 1, document them. Finding more is a positive signal, but fixing fewer bugs well is better than fixing many bugs poorly.
- The fake API resets on page refresh. This is by design, not a bug.
