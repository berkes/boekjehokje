# Architecture Decision Records (ADRs)

ADRs record important architectural decisions for boekjehokje: the context, the
options considered, and the outcome. They are numbered in the order they are
created and never removed — a superseded ADR only gets a status change and a
link to its replacement.

## Index

| Number                                                   | Title                                                                                                             | Status   |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| [0001](0001-playwright-e2e-and-agent-browser-testing.md) | Use Playwright for E2E testing, with containerized Google API mocks and agent-driven browser tooling              | accepted |
| [0002](0002-hybrid-booking-workflow.md)                  | Support both room-first and time-first booking through a hybrid overview dashboard                                | accepted |
| [0003](0003-pure-frontend-tech-stack.md)                 | Adopt a pure-frontend React 19 + TypeScript stack with MUI, DayPilot Lite, and Google Calendar as source of truth | accepted |
| [0004](0004-editability-ownership.md)                    | Determine editability by creator-email ownership                                                                  | proposed |
| [0005](0005-super-calendar-migration.md)                 | Replace DayPilot Lite with super-calendar for the resource calendar view                                          | proposed |

## Format

Each ADR is a single Markdown file named `NNNN-short-title.md`. It follows the
template below (sections marked optional may be removed):

```markdown
# {short title of solved problem and solution}

|           |                                                           |
| --------- | --------------------------------------------------------- |
| Status    | {proposed                                                 |
| Date      | {YYYY-MM-DD when the decision was last updated}           |
| Deciders  | {everyone involved in the decision}                       |
| Consulted | {subject-matter experts consulted, two-way communication} |
| Informed  | {everyone kept up-to-date, one-way communication}         |

## Context and Problem Statement

## Decision Drivers (optional)

## Considered Options

## Decision Outcome

### Consequences (optional)

## Validation (optional)

## Pros and Cons of the Options

## More Information (optional)
```

New ADRs are written with status `proposed` and only move to `accepted` after
explicit sign-off. Until then they can be updated freely; after acceptance,
changes go through a superseding ADR.
