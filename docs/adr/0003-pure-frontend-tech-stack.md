# Adopt a pure-frontend React 19 + TypeScript stack with MUI, DayPilot Lite, and Google Calendar as source of truth

|           |                          |
| --------- | ------------------------ |
| Status    | accepted                 |
| Date      | 2026-10-19               |
| Deciders  | berkes                   |
| Consulted | Vibe Code agent          |
| Informed  | boekjehokje contributors |

## Context and Problem Statement

boekjehokje must give the NYMA Makersplaats a structured, Dutch-language UI for
booking meeting rooms on top of a shared Google Calendar, while keeping Google
Calendar as the authoritative store so users who book directly in Google
Calendar are never blocked. The tool must be simpler to use than Google
Calendar, cheap to host and maintain, and built for type safety and easy
maintenance.

This ADR was derived from older project documentation (`docs/tech_stack.md`),
which it replaces. Which technology stack do we build the app on?

## Decision Drivers

- Type safety across the codebase: catch errors early, better tooling and
  maintainability as the project grows.
- Pure frontend, no backend: Google Calendar is the source of truth for events;
  `localStorage` holds only user preferences (name, contact information,
  settings), never business data.
- Leverage open-source libraries rather than hand-building UI components.
- Minimal hosting and operations cost: a static SPA.
- Dutch UI, with a resource calendar view (rooms as columns, time as rows) — see
  [ADR-0002](0002-hybrid-booking-workflow.md).
- Deno-first repo toolchain (`deno task`, `deno install`; no npm scripts).
- Guide users visually; no strict rule enforcement, no notifications, no admin
  dashboard (MVP scope).

## Considered Options

### Frontend framework and language

- React 19 with TypeScript
- Vue 3 with TypeScript
- Svelte with TypeScript
- Vanilla TypeScript (no framework)

### Styling / component library

- Material-UI (MUI) with TypeScript
- Tailwind CSS
- Hand-written custom CSS

### Calendar component

- DayPilot Lite (`@daypilot/daypilot-lite-react`)
- FullCalendar
- Custom-built calendar component

### State management

- React Context API with typed hooks
- Redux Toolkit
- Zustand

### Data storage / persistence model

- Pure frontend: Google Calendar API for events, `localStorage` for user
  preferences
- Backend-as-a-service (Firebase, Supabase) with own database

### Hosting and deployment

- GitHub Pages, built and deployed by GitHub Actions CI
- Vercel
- Netlify

## Decision Outcome

Chosen option: **a pure-frontend TypeScript SPA** built with React 19, MUI,
DayPilot Lite, the React Context API, Google OAuth, and the Google Calendar API,
hosted on GitHub Pages via GitHub Actions — with Deno as the local/CI toolchain.

- **React 19 with TypeScript**: popular, excellent TypeScript support, strong
  community; type-safe props, API responses, and context values.
- **MUI**: pre-made, accessible React components with built-in TypeScript
  support and a theming system; a polished Dutch-language UI without
  hand-written CSS.
- **DayPilot Lite**: free, open-source resource calendar (rooms as columns, time
  as rows) with TypeScript support and customization options for events and
  availability — a natural fit for the hybrid dashboard of ADR-0002.
- **Context API with typed hooks**: sufficient state complexity for this app; no
  extra dependency, full type safety on context values.
- **Google OAuth (`@react-oauth/google`)** and **Google Calendar API** with
  TypeScript: type-safe interactions; Google Calendar remains the single source
  of truth, so users can keep booking directly in it.
- **GitHub Pages + GitHub Actions**: no extra hosting account; builds run in CI
  on every push and PR, and tagged releases deploy to Pages automatically.
- **Deno + Vite** as the toolchain: `deno task dev|build|lint` for local work;
  `deno install` manages dependencies.

### Consequences

- Good, because TypeScript throughout (app, tests, API layer) catches errors
  early and keeps the codebase maintainable.
- Good, because reusing MUI and DayPilot Lite saves development time and yields
  a polished UI out of the box.
- Good, because the pure-frontend model has no backend to run, secure, or pay
  for, and Google Calendar stays authoritative.
- Bad, because the app is fully dependent on the Google Calendar API's behavior,
  rate limits, and OAuth flow.
- Bad, because without a backend there is no place for server-side features
  (notifications, admin tooling, usage analytics) — explicitly out of scope for
  the MVP.

## Validation

- `deno task build` (tsc + vite build) type-checks the whole app in CI.
- Unit tests (Deno test + `@std/testing`) cover module public interfaces and the
  Google Calendar interactions, with the API client injected as a dependency.
- The E2E suite from
  [ADR-0001](0001-playwright-e2e-and-agent-browser-testing.md) exercises the
  stack end-to-end against a WireMock mock of the Google APIs, and a tagged
  release deploying to GitHub Pages validates the hosting setup.

## Pros and Cons of the Options

### Frontend framework and language

#### React 19 with TypeScript

- Good, because excellent TypeScript support and a large community.
- Good, because React 19 plus react-router-dom is already proven in this repo.
- Neutral, because the virtual-DOM bundle is heavier than compiled frameworks.

#### Vue 3 / Svelte

- Good, because both have TypeScript support and smaller output.
- Bad, because smaller pool of ready-made Dutch-UI-friendly component and
  calendar libraries; no advantage that outweighs the ecosystem React offers.

#### Vanilla TypeScript

- Good, because no framework overhead.
- Bad, because hand-building an interactive calendar dashboard is far more work
  and more bug surface than the budget allows.

### Styling / component library

#### MUI

- Good, because pre-made accessible components with TypeScript types, theming,
  and responsive helpers (`useMediaQuery`).
- Good, because it matches AGENTS.md UI conventions (rely on MUI defaults, `sx`
  overrides, central theme).

#### Tailwind CSS

- Good, because utility-first styling is flexible.
- Bad, because it provides styling, not components; we would still hand-build
  dialogs, selects, and layouts, and it drifts from the MUI defaults the project
  standardizes on.

#### Custom CSS

- Good, because full control and no dependency.
- Bad, because slowest to build and hardest to keep consistent and accessible.

### Calendar component

#### DayPilot Lite

- Good, because free open-source resource calendar (rooms as columns, time as
  rows), TypeScript support, event/availability customization.
- Neutral, because the Lite edition limits some advanced scheduling features;
  the Pro edition is commercial.

#### FullCalendar

- Good, because mature and well-documented.
- Bad, because its resource-timeline views sit behind paid premium plugins.
- Bad, because less of a fit for the room-column layout than DayPilot.

#### Custom calendar component

- Good, because exactly what we need, no dependency.
- Bad, because the calendar is the core of the app; building and maintaining it
  from scratch is the largest possible risk to the MVP.

### State management

#### Context API with typed hooks

- Good, because zero extra dependencies and typed context values suffice for
  this app's state complexity.

#### Redux Toolkit / Zustand

- Good, because better devtools and middleware for complex state.
- Bad, because extra dependency and boilerplate for state that does not need it.

### Data storage / persistence model

#### Pure frontend: Google Calendar + localStorage

- Good, because no backend, no database, no hosting cost; Google Calendar
  remains the single source of truth and direct Google Calendar usage keeps
  working.
- Good, because users' preferences stay on their own device.
- Bad, because no server-side logic possible; conflict detection is limited to
  what the Calendar API and client-side checks provide.

#### Backend-as-a-service (Firebase, Supabase)

- Good, because server-side validation, notifications, and analytics become
  possible.
- Bad, because it duplicates the source of truth (or introduces sync problems
  with it), adds vendor cost, and contradicts the "pure frontend, Google
  Calendar is the source of truth" driver and the MVP scope.

### Hosting and deployment

#### GitHub Pages + GitHub Actions

- Good, because no extra hosting account; CI builds on every push and PR and
  deploys tagged releases to Pages automatically.

#### Vercel / Netlify

- Good, because zero-config deploys and preview environments.
- Bad, because an extra external account and service for a static SPA that
  GitHub already hosts.

## More Information

- This ADR was derived from the old documentation `docs/tech_stack.md`, which
  has been removed from the repository.
- The old AGENTS.md tech-stack overview once listed "statichost.eu via GitLab
  CI" for hosting; this ADR records **GitHub Pages via GitHub Actions** as the
  decision, matching the release process documented in AGENTS.md and the choice
  in the source document. Reconcile the AGENTS.md overview if needed.
- Unit testing uses Deno's built-in test runner with JSR `@std/testing` (Jest +
  React Testing Library, mentioned in the old document, is no longer the
  runner); E2E testing is decided in
  [ADR-0001](0001-playwright-e2e-and-agent-browser-testing.md).
