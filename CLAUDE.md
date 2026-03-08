# CLAUDE.md

This file provides guidance to Claude Code when working in this project.

## Language

Always respond in Japanese.

## Development Workflow

This project follows a **Discussion → Document → TDD** cycle. Never skip phases.

### Phase 1: Discussion
- Explore ideas, clarify requirements, evaluate trade-offs with the user
- Do not write code until requirements and approach are agreed upon
- Use the `architect` agent for system design decisions
- Use the `planner` agent to break down the agreed approach into steps

### Phase 2: Documentation
- Use the `doc-updater` agent to produce PRD, Design Doc, and ADRs from the discussion
- Code must not start until the user has reviewed and approved the documents
- Place documents in `docs/` (PRD → `docs/prd.md`, Design Doc → `docs/design.md`, ADRs → `docs/adr/ADR-NNN-title.md`)

### Phase 3: Implementation (TDD)
- Use the `tdd-guide` agent to enforce test-first development
- Cycle: RED (write failing test) → GREEN (minimal implementation) → REFACTOR
- Minimum 80% coverage required before a task is considered complete
- Use the `code-reviewer` agent after every meaningful change
- Use the `security-reviewer` agent when touching auth, APIs, or user input

### Phase 4: Maintenance
- Use the `refactor-cleaner` agent for dead code removal and deduplication
- Keep documents in `docs/` updated when architecture changes

## Project Status Management

**MANDATORY**: Keep `PROJECT_STATUS.md` up to date throughout every session.

- Update the file after every completed task and every phase transition
- The goal is always-accurate sync between Claude and the user: "what is done, what is in progress, what is next"
- At session start, read `PROJECT_STATUS.md` first to restore context
- At session end (or after each major milestone), write back the updated status

## Available Agents

| Agent | Role | Typical Trigger |
|-------|------|----------------|
| `architect` | System design, trade-off analysis, ADR drafting | Phase 1 — design decisions |
| `planner` | Feature breakdown into actionable steps | Phase 1 — after approach is agreed |
| `doc-updater` | Create/update PRD, Design Doc, ADRs | Phase 2 — documentation |
| `tdd-guide` | TDD workflow, test scaffolding, coverage | Phase 3 — all coding |
| `code-reviewer` | Code quality, patterns, best practices | Phase 3 — after changes |
| `security-reviewer` | OWASP Top 10, secrets, access control | Phase 3 — security-sensitive code |
| `refactor-cleaner` | Dead code, duplicates, dependency cleanup | Phase 4 — maintenance |

## Coding Principles

- **Tests first**: never write implementation before a failing test exists
- **Small files**: prefer many small focused files over large ones (aim for <300 lines)
- **Immutability**: prefer spread/map/filter over direct mutation
- **No debug code**: remove all `console.log` before marking a task complete
- **Parameterized queries**: never concatenate user input into SQL or shell commands
- **Env vars**: never hardcode secrets; always use environment variables

## Document Templates

When the `doc-updater` agent creates documents, use these structures:

**PRD** (`docs/prd.md`): Problem statement · User stories · Success metrics · Out of scope

**Design Doc** (`docs/design.md`): Overview · Architecture · Component design · Data models · Trade-offs · Open questions

**ADR** (`docs/adr/ADR-NNN-title.md`): Context · Decision · Consequences (positive/negative) · Alternatives considered · Status
