# Agent Guide for boekjehokje

## Tech Stack Overview

- **Runtime**: Deno with Vite
- **Frontend**: React 19+ with TypeScript
- **UI**: Material-UI (MUI) v9 with TypeScript
- **Calendar**: super-calendar (`@super-calendar/dom`) with TypeScript
- **State**: React Context API with typed hooks (services are React-free; the
  hooks manage their results as React state — see ADR-0007)
- **Auth**: Google OAuth 2.0 behind the AuthenticationService port (see
  "Authentication Architecture" below)
- **API**: Google Calendar API
- **Storage**: Google Calendar for events, localStorage for user preferences and
  the authentication session
- **Testing**: Deno's built-in test runner with JSR `@std/testing`
- **Hosting**: GitHub Pages via GitHub Actions

## Terminology

- Use "authentication" instead of "auth" to avoid ambiguity with "authorization"

## Project Structure

```
.
├── docs/               # Project documentation
│   └── adr/            # Architecture Decision Records
│   └── tasks/          # Per-issue task write-ups
├── e2e/                # Playwright E2E suite (see docs/e2e.md)
├── tests/              # Integration tests: two real services (see ADR-0008)
├── src/                # Source code
│   ├── App.tsx         # Composition root: builds the service tree, provides it
│   ├── main.tsx        # Entry point
│   ├── assets/         # Static assets (landing page screenshots)
│   ├── components/     # UI components (incl. pages/ and the calendar board)
│   ├── hooks/          # React bridge: ServicesProvider, useServices, useSession, useCalendar, ...
│   ├── services/       # Service modules: authentication, calendar, permissions, clock, preferences
│   │   └── <name>/     #   <Name>Port.ts, <Name>Service.ts, output ports, adapters, index.ts, __tests__/
│   ├── testing/        # Central test fakes & test-tree builders (tests only, not in the app build)
│   └── theme.ts        # MUI theme
├── package.json        # Dependencies & scripts
├── vite.config.ts      # Vite configuration
└── tsconfig.json       # TypeScript configuration
```

The app has only components, hooks, services, ports and adapters (repositories
for external storage) — see ADR-0007 and docs/architecture.md. There is no
`utils/`, `context/`, `config/` or `pages/` category: date helpers live in
`services/clock/`, the session context in `hooks/useSession.tsx`, Google
endpoints in the Google adapters, and pages under `components/pages/`.

## TypeScript Best Practices

### Do

- Use `deno install` etc to manage packages. This will change package.json, but
  we never edit package.json manually.
- Use `deno run` to run commands
- Define interfaces for all props, API responses, and context values
- Prefer `type` for simple unions, `interface` for object shapes
- Use `as const` for static value arrays/objects
- Export types alongside components (`export type { Props }`)
- Use generics for reusable hooks/components

### Don't

- Use npm, npx or other runners. Only use deno.
- Use `any` - prefer `unknown` if type is truly dynamic
- Use type assertions (`as Type`) without validation
- Ignore ESLint `@typescript-eslint` rules
- Mix `interface` and `type` for the same concept

## MUI Best Practices

### Do

- Use MUI components directly (not custom wrappers)
- Rely on MUI's default styling; set up MUI by default for all UI
- Leverage `sx` prop for simple styling overrides
- Define theme in a central file with TypeScript support
- Use `useMediaQuery` for responsive layouts
- Customize default props via theme for consistency
- Keep layouts simple: no cards, zebra striping, or complex styling
- Don't use "back to" links on pages

### Don't

- Deeply nest MUI components unnecessarily
- Write custom CSS unless an explicit exception is made
- Override MUI base styles without design system rationale
- Create custom components when MUI provides equivalent
- Inline complex styles - extract to theme or styled()

## Dos and Don'ts

### Do

- Follow the pure frontend architecture (Google Calendar = source of truth)
- Keep UI in Dutch as specified in ADR-0002
- Keep UI text inline in the component JSX.
- Write Dutch UI text consistently: instructive form for actions and buttons,
  present/past tense for states, and one term per concept (e.g. `inloggen` for
  authentication)
- Guide users visually, don't enforce rules strictly
- Use localStorage only for user preferences, not business data
- Write type-safe API interactions with Google Calendar

### Don't

- Implement admin dashboards (out of scope for MVP)
- Add email or in-app notifications (out of scope, see ADR-0003)
- Store event data anywhere but Google Calendar
- Block direct Google Calendar usage by users
- Add features without updating corresponding docs

### Code Quality

- Components: Small, single-responsibility, typed props
- Hooks: Reusable, typed, prefixed with `use`
- Tests: Type-safe, alongside implementation files
- Commits: Follow conventional commits (feat, fix, docs, etc.)

### Module Design

- The app is structured as components, hooks, services, ports and adapters
  (ADR-0007): `src/components/`, `src/hooks/`, `src/services/<name>/`. Every
  service module has the same layout: `<Name>Port.ts` (input port + domain
  types), `<Name>Service.ts`, output ports, adapters/repositories, private
  helpers, `index.ts` (the module's whole public API), `__tests__/`.
- Limit public interfaces: only export what must be used outside the module
  (deep modules: the `index.ts` is the whole public API).
- Services are objects with methods; all dependencies are passed in on creation
  (deps object). Services, ports and adapters never touch React state — they
  only store it (repositories) or get it passed in as arguments. The whole tree
  of services and repositories is composed once on top level in `App.tsx` and
  provided through `ServicesProvider`; components reach services only through
  the hooks in `src/hooks/`.
- Use dependency injection with interfaces for testability: input ports describe
  what hooks and other services may call; output ports (implemented by adapters)
  describe what a service calls out; repositories persist state externally
  (localStorage, REST APIs).

### Authentication Architecture

Authentication follows the service-with-dependency-injection pattern of ADR-0007
(originally issue #12): an anti-corruption layer around Google OAuth, in
`src/services/authentication/`.

- `AuthenticationServicePort` (input port) defines the domain language API
  (`login`, `logout`, `getAuthenticatedUser`, `isAuthenticated`, `getTokens`,
  `fetchProfile`) in our own types (`AuthenticatedUser`, `AuthenticationTokens`,
  `AuthenticationSession`).
- `AuthenticationService` implements the port: it runs the login flow through
  the `AuthenticationProviderPort` (output port), persists the session through
  the `SessionStoragePort` repository, and validates expiry on reads.
- `GoogleAuthenticationAdapter` implements the provider port. All Google details
  (scopes, response shapes, token expiry math, People API, the
  `@react-oauth/google` wiring via its `useGoogleLoginFlow` bridge) stay in the
  adapter. Do not import Google OAuth types outside this module.
- Sessions persist through `SessionStoragePort`; `LocalSessionStorageAdapter`
  stores them in localStorage.
- The React glue lives in `src/hooks/` (never in the service module):
  `ServicesProvider` provides the service tree composed in `App.tsx`, and
  `useSession` (`hooks/useSession.tsx`) manages the session as React state.
  Tests and E2E harnesses inject fakes instead of the Google adapter.

Fake-auth seam for tests and E2E: establish a fake authenticated session either
by injecting a fake `AuthenticationServicePort` (and `SessionStoragePort`), or
by writing a session to the localStorage key `boekjehokje_authentication`
(`AUTHENTICATION_STORAGE_KEY` in
`src/services/authentication/LocalSessionStorageAdapter.ts`) shaped as
`{"user":{"name":"...","email":"..."},"tokens":{"accessToken":"...","tokenType":"Bearer","expiresAt":<epoch milliseconds in the future>}}`.
The app restores such a session without any Google interaction.

## Testing

Strategy per ADR-0008: unit tests in each module's `__tests__/`, integration
tests in `tests/integration/` (exactly two real services; e2e covers more), run
everything with plain `deno test`.

- Write unit tests for the public interface of modules (the module's `index.ts`
  / port), never for private items
- Keep tests simple, clean, and focused on behavior
- Use dependency injection to mock external dependencies: complex fakes/spies
  come from the central kit in `src/testing/` (`FakeClock`,
  `FakeAuthenticationService`, `FakeAuthenticationProvider`,
  `InMemorySessionStorage`, `InMemoryKeyValueStore`,
  `FakeCalendarEventRepository`
  - `storedEvent`, and `buildTestServices()` which composes a subset of the real
    service tree over the fakes); simple mocks may be built in the test itself
- Integration tests in `tests/integration/` compose subsets of actual trees with
  two real services (e.g. calendar + permissions) over the central fakes; never
  test more than two services there — e2e covers that
- Test domain logic, not implementation details
- `src/testing/` and `src/**/__tests__` are excluded from the app build
  (`tsconfig.app.json`)

### E2E tests

The Playwright suite in `e2e/` runs against the WireMock-mocked Google APIs; see
[docs/e2e.md](docs/e2e.md) for the full setup. Conventions:

- Run `deno task test:google-mock` (the WireMock container) and
  `deno task test:e2e` (the suite) in separate terminals.
- Every test carries a user-story comment (Given/When/Then plus "So that ...")
  and a user-view title. The body reads like the story: setup and `goto()` for
  Given, actions for When, `assert*` methods for Then.
- Page objects in `e2e/pages/` hold the state and speak the app's domain
  language. Selectors, labels and shapes of expected strings live in the page
  objects — never in the tests. Expectations in actions bubble up.
- Assertions are explicit and reproducible: tests pass the concrete strings they
  expect (bookings, bookers, durations, day labels), made stable by the fixed
  clock in `e2e/fixtures/auth.ts` (`FIXED_NOW`). Never parse page content and
  assert against the parsed value, and never depend on the real run date.
- Booking specs cover the create, update and delete writes (POST/PATCH/DELETE to
  the mocked events endpoint, issue #14); the timed undo toast is issue #36.
- `deno lint` and `deno fmt --check` cover `e2e/` with the rest of the repo; the
  suite is type-checked by `deno check` (CI runs it on `e2e/`, since
  `deno task build` only covers `src`).

## Getting Started

```bash
deno task dev
deno task build
deno task lint
```

If the user is already running `deno task dev`, don't just willy-nilly kill
that. Instead, rely on that process to auto-refresh and show the user the
changes.

You can preview the changes on http://localhost:5173/

If, for some reason, restarting or stopping that service is required, ensure to
re-start it after finishing your task or at least notify the user that it was
stopped and why it was stopped.

## Landing Page Screenshots

The landing page (`src/components/pages/Landing.tsx`) shows two screenshots of
the calendar overview, bundled from `src/assets/overview-desktop.png` and
`src/assets/overview-mobile.png`. On every visible change to the app, the
screenshots must be updated — never leave stale ones behind.

To retake them:

1. Run `deno task dev`.
2. Seed a fake authenticated session in the browser's localStorage under the key
   `boekjehokje_authentication` (shape as in "Authentication Architecture"
   above; use the mock user from `e2e/fixtures/auth.ts`: name "Bèr", email
   ber@boekjehokje.test). Optionally fix the clock to `FIXED_NOW` from the same
   file so the board shows a stable week.
3. Open `/demo` (the demo board needs the seeded session) and screenshot the
   board at 1440x900 (desktop) and at 430x932 (mobile emulation), both at device
   scale factor 2 — e.g. with Playwright.
4. Overwrite `src/assets/overview-desktop.png` and
   `src/assets/overview-mobile.png`, check that the landing page (`/`) shows
   them, and commit.

## Releasing

Releases are cut from `main` as tags. A tag triggers the `build.yml` workflow,
which builds and deploys to GitHub Pages.

To cut a release:

1. Make sure `main` is up to date and the working tree is clean:
   ```bash
   git -C <repo> checkout main
   git -C <repo> pull --ff-only origin main
   ```
2. Bump `"version"` in `package.json` to the new `x.y.z` (semver). Only the
   version field changes; do not hand-edit other `package.json` entries.
3. Commit and tag, then push both to `origin`:
   ```bash
   git -C <repo> add package.json
   git -C <repo> commit -m "chore: release vX.Y.Z"
   git -C <repo> tag vX.Y.Z
   git -C <repo> push origin main
   git -C <repo> push origin vX.Y.Z
   ```

The pushed tag is what deploys: once `refs/tags/vX.Y.Z` is on `origin`, the CI
build/deploy jobs run automatically. Confirm a release lands on `main` before
tagging, and verify the GitHub Pages deploy succeeds after pushing the tag.
