# Agent Guide for boekjehokje

## Tech Stack Overview

- **Runtime**: Deno with Vite
- **Frontend**: React 19+ with TypeScript
- **UI**: Material-UI (MUI) v9 with TypeScript
- **Calendar**: super-calendar (`@super-calendar/dom`) with TypeScript
- **State**: React Context API with typed hooks
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
├── docs/              # Project documentation
│   └── adr/            # Architecture Decision Records
├── src/               # Source code
│   ├── App.tsx         # Main application
│   ├── main.tsx        # Entry point
│   ├── assets/         # Static assets
│   ├── components/     # UI components
│   ├── context/        # React contexts (user session)
│   ├── services/       # Domain services (calendar, authentication)
├── public/            # Static files
├── package.json       # Dependencies & scripts
├── vite.config.ts     # Vite configuration
└── tsconfig.json      # TypeScript configuration
```

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

- Limit public interfaces: only export what must be used outside the module
- Group logically related functionality into bounded domain modules (either in
  subdirs with index.ts or in single files)
- Use dependency injection with interfaces for testability

### Authentication Architecture

Authentication follows the same service-with-dependency-injection pattern as the
calendar domain (see issue #12): an anti-corruption layer around Google OAuth,
in `src/services/authentication/`.

- `AuthenticationServicePort` defines the domain language API (`login`,
  `logout`, `getAuthenticatedUser`, `isAuthenticated`, `getTokens`,
  `fetchProfile`) in our own types (`AuthenticatedUser`, `AuthenticationTokens`,
  `AuthenticationSession`).
- `GoogleAuthenticationAdapter` implements the port. All Google details (scopes,
  response shapes, token expiry math, People API, the `@react-oauth/google`
  wiring) stay in the adapter and its `useGoogleLoginFlow` bridge. Do not import
  Google OAuth types outside this module.
- Sessions persist through `SessionStoragePort`; `LocalSessionStorageAdapter`
  stores them in localStorage.
- `AuthenticationProvider` provides the port and the session storage through
  React context. The session storage and the adapter are passed in as
  properties, so tests and E2E harnesses can inject fakes;
  `GoogleAuthenticationWrapper` is the composition root for the Google adapter
  and its login-flow bridge.

Fake-auth seam for tests and E2E: establish a fake authenticated session either
by injecting a fake `AuthenticationServicePort` (and `SessionStoragePort`), or
by writing a session to the localStorage key `boekjehokje_authentication`
(`AUTHENTICATION_STORAGE_KEY`) shaped as
`{"user":{"name":"...","email":"..."},"tokens":{"accessToken":"...","tokenType":"Bearer","expiresAt":<epoch milliseconds in the future>}}`.
The app restores such a session without any Google interaction.

## Testing

- Write unit tests for the public interface of modules
- Keep tests simple, clean, and focused on behavior
- Use dependency injection to mock external dependencies
- Test domain logic, not implementation details

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
- Booking specs stay read-side only until write flows are finalized (issue #14).
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
