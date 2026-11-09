# Task: restructure the app as components, hooks, services, ports and adapters

Implements the architecture proposal recorded in
[ADR-0007](../adr/0007-components-services-ports-adapters.md) (testing strategy
in [ADR-0008](../adr/0008-testing-strategy-services.md)). Behavior of the app is
unchanged — this is a pure restructuring.

## Status

Implemented on branch `vibe/service-architecture-94fd1c`, on top of `main`.

## What changed

### Flat structure, four kinds of modules (ADR-0007)

`src/` now has exactly three module categories plus entry files:

```
src/
├── App.tsx            # composition root
├── main.tsx, theme.ts, assets/
├── components/        # UI: calendar/, pages/, authentication/, ProfileMenu, ProtectedRoute
├── hooks/             # ServicesProvider, useServices, useSession, useCalendar, useRoomVisibility, roomVisibility
├── services/          # authentication/, calendar/, permissions/, clock/, preferences/
└── testing/           # central fakes (tests only; excluded from the app build)
```

Removed categories: `utils/`, `context/`, `config/`, `pages/` (now
`components/pages/`).

- `utils/clock.ts` → `services/clock/` (`ClockPort`, `SystemClock`, pure date
  helpers in `dates.ts`).
- `utils/types.ts` → `services/calendar/googleShapes.ts` (private Google JSON
  shapes, only seen by the Google adapter).
- `utils/calendar/CalendarApiClient.ts` + `GoogleCalendarApiClient.ts` →
  `services/calendar/CalendarEventRepositoryPort.ts` (output port speaking the
  neutral `StoredEvent`/`EventDraft` language) +
  `GoogleCalendarRepositoryAdapter.ts` (REST; reads the OAuth token from the
  authentication service per call; owns the calendar ID and base URL; the unused
  `listCalendars` is gone).
- `utils/googleCalendarApi.ts` → `services/calendar/CalendarApiError.ts`.
- `config/googleApi.ts` deleted; the base-URL env overrides moved into the two
  Google adapters.
- `context/` deleted; the session state hook is `hooks/useSession.tsx`
  (`useSession`, same API as the old `useUser`), provided by `SessionProvider`.
- `components/calendar/utils.tsx` → `components/calendar/board.ts` (pure
  board-mapping helpers, tested in `__tests__/board.test.ts`);
  `RoomVisibiltyControls.tsx` typo fixed to `RoomVisibilityControls.tsx`;
  `bookerContact.ts`/`roomVisibility.ts` folded into the preferences service.

### Services are objects with methods, DI on creation, no React state

Each `services/<name>/` module has the same layout: `<Name>Port.ts` (input port

- domain types), `<Name>Service.ts`, output port(s), adapters/repositories,
  private helpers, `index.ts`, `__tests__/`.

* **calendar**: `CalendarService` implements `CalendarServicePort`
  (`getDay`/`createBooking`/`updateBooking`/`deleteBooking`) over a
  `CalendarEventRepositoryPort` + the permission service + the clock. The old
  `GoogleCalendarAdapter` god-module is gone: parsing/grouping/ignore-list live
  in `CalendarService` + private `parser.ts`/`rooms.ts`, the write side of the
  event format in `eventFormat.ts` (`bookingToEvent`), REST in
  `GoogleCalendarRepositoryAdapter`, demo data in
  `DemoCalendarRepositoryAdapter`.
* **permissions** (new): `PermissionService` implements `PermissionServicePort`
  (`may("create")` / `may("update"|"delete", booking)`) with the ADR-0004
  ownership rule, reading the current user from the authentication service.
  `CalendarService.getDay()` now calls `permissions.may("update", booking)` to
  mark editable bookings — the service interaction from the proposal.
* **authentication**: split into `AuthenticationService` (implements the input
  port; session + expiry logic) over `AuthenticationProviderPort` (output port)
  implemented by `GoogleAuthenticationAdapter` (OAuth response normalization +
  People API), plus the `SessionStoragePort` repository. The React glue
  (`AuthenticationProvider`, `GoogleAuthenticationWrapper`) moved out of the
  service module into the composition root / hooks.
* **preferences** (new): `PreferencesService` implements `PreferencesPort`
  (booker contact, hidden rooms) over the `KeyValueStorePort` repository
  (`LocalStorageAdapter`). Owns the never-throw rule for preferences.
* **clock**: `ClockPort` + `SystemClock`.

### Composition root

`App.tsx` (`AppServices`, under `GoogleOAuthProvider`) builds the entire tree —
authentication, permissions, calendar, clock, preferences and their repositories
— once, with all dependencies injected, and provides it through
`ServicesProvider` + `SessionProvider`. Components reach services only via the
hooks (`useCalendarService()`, `useSession()`, `useCalendar()`, `useClock()`,
`usePreferences()`, …). `CalendarView` no longer takes a service prop. The demo
page composes a subset tree (calendar service over the demo repository) and
provides it via a nested `ServicesProvider`; as a side effect `/demo` now also
works signed out (all read-only), matching its docstring.

### Testing (ADR-0008)

- `src/testing/` — the central fake kit: `FakeClock`,
  `FakeAuthenticationService`, `FakeAuthenticationProvider`,
  `InMemorySessionStorage`, `InMemoryKeyValueStore`, `InMemoryBrowserStorage`,
  `FakeCalendarEventRepository` + `storedEvent` factory (records fetches and
  writes), and `buildTestServices()` composing a subset of the real tree over
  the fakes. Excluded from the app build via `tsconfig.app.json`.
- Unit tests rewritten to use it (e.g. `CalendarService.test.ts` no longer spies
  on an HTTP client; `AuthenticationService.test.ts` is new, the Google adapter
  test now covers only the provider port; preferences tests cover the service +
  adapter).
- `tests/integration/` — two-service integration tests with real code on both
  sides: `calendar-permissions.test.ts` (getDay marks editable via the
  permission service, case-insensitive email, signed-out) and
  `authentication-permissions.test.ts` (login/logout/expiry reflected in
  `may(...)`).
- `deno.json` fmt exclude updated to the renamed demo adapter; plain `deno test`
  collects `src/**` + `tests/` (197 tests).

### Docs

- New ADR-0007 (structure) and ADR-0008 (testing strategy), indexed in
  `docs/adr/README.md`.
- `docs/architecture.md` rewritten for the new structure (diagrams updated).
- `AGENTS.md` updated: project structure, Module Design, Authentication
  Architecture, Testing, landing-page path. `docs/e2e.md` and the WireMock
  template comment updated for the moved files. The fake-auth localStorage seam
  (`boekjehokje_authentication`, same shape) is unchanged.

## Verification

- `deno test` — 197 passed, 0 failed (was 181 before; +unit/-old +integration).
- `deno lint`, `deno fmt --check`, `deno task build` (tsc + vite) green.
- `deno check e2e/...` (the CI e2e type-check) green.
- The Playwright suite itself needs the WireMock container (docker) and was not
  run in the sandbox; CI runs it on the PR.
