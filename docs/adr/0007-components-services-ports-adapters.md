# Structure the app as components, hooks, services, ports and adapters

|           |                          |
| --------- | ------------------------ |
| Status    | proposed                 |
| Date      | 2026-11-09               |
| Deciders  | berkes                   |
| Consulted | Vibe Code agent          |
| Informed  | boekjehokje contributors |

## Context and Problem Statement

The app had grown an inconsistent set of module kinds: `components/`, `hooks/`,
`context/`, `services/`, `utils/`, `config/` and `pages/`, with the `utils/` in
particular set up, tested and used differently from everything else (a catch-all
of API clients, clock helpers and shared types, imported directly from
components and services alike). `CalendarServicePort.ts` +
`GoogleCalendarAdapter.ts` had become a god-module pair: parsing, grouping,
ignore-lists, editability, serialization and REST calls all lived between them,
and adapters were passed around as "the service".

We want one flat, predictable project structure where every module is one of a
small set of kinds, set up and used the same way: **components**, **hooks**,
**services**, **ports** and **adapters** (with repositories for external
storage). No `utils/`, no `context/`, no `config/`, no separate `pages/`.

## Decision Drivers

- One consistent mental model: a component calls only services, through hooks;
  the result is managed as normal React state. Services, ports and adapters
  never touch React state — they only store it (repositories) or get it passed
  in as arguments.
- Services are objects with methods whose inner state is ephemeral and never
  duplicates React state. All dependencies are passed in on creation (dependency
  injection), so any service can be unit-tested in isolation.
- A consistent, explicit list of services that interact (e.g. the calendar
  service asks the permission service whether a booking may be edited).
- Deep modules with small public interfaces (one `index.ts` per module), all at
  the same level, with predictable names.
- Behavior of the app is unchanged: this is a pure restructuring.

## Considered Options

- Keep the current mixed structure (utils, context, config, pages) and tidy up
  case by case.
- A layered `src/{domain,application,infrastructure,ui}` package-by-feature
  structure.
- The flat components/hooks/services structure with ports, adapters and
  repositories inside the service modules.

## Decision Outcome

Chosen option: **a flat `src/` with exactly three module categories —
`components/`, `hooks/`, `services/` — plus the entry files** (`main.tsx`,
`App.tsx`, `theme.ts`, `assets/`). Ports and adapters live inside the service
modules they belong to; repositories are the persistence-facing adapters.

### The four kinds of things

- **Components** (`src/components/<feature>/`) — pure UI (MUI + the
  super-calendar board). Pages are components too (`components/pages/`). They
  import domain types and pure helpers from the services barrel, and get service
  _instances_ only through hooks. Component-local pure helpers (e.g. `board.ts`,
  `freeSlots.ts`) live inside the component module and are unit-tested there.
- **Hooks** (`src/hooks/`) — the React bridge. `ServicesProvider` provides the
  service tree through context; `useServices.ts` exposes typed accessors
  (`useCalendarService()`, `useAuthenticationService()`, `useClock()`, …); the
  domain hooks (`useSession`, `useCalendar`, `useRoomVisibility`) call the
  services and manage the results as React state.
- **Services** (`src/services/<name>/`) — objects with methods, implementing
  their **input port** (an interface describing the methods other services and
  hooks call, e.g. `CalendarServicePort`, `AuthenticationServicePort`,
  `PermissionServicePort`, `PreferencesPort`, `ClockPort`). All dependencies are
  passed in on creation as a deps object; inner state is ephemeral.
- **Ports and adapters / repositories** — inside each service module: **output
  ports** describe what the service calls out (e.g.
  `CalendarEventRepositoryPort`, `AuthenticationProviderPort`,
  `KeyValueStorePort`, `SessionStoragePort`), implemented by **adapters**
  (`GoogleCalendarRepositoryAdapter`, `GoogleAuthenticationAdapter`,
  `LocalStorageAdapter`, `LocalSessionStorageAdapter`,
  `DemoCalendarRepositoryAdapter`). Adapters that persist state externally
  (REST, localStorage) are the **repositories**. Provider-specific shapes
  (Google JSON, OAuth) never leave the adapter.

### The service tree and the composition root

The consistent list of services: **authentication**, **permissions**,
**calendar**, **clock**, **preferences**. They interact: the calendar service's
`getDay()` asks the permission service `may("update", booking)` to mark editable
bookings (ADR-0004); the permission service reads the current user from the
authentication service; the Google Calendar repository reads the OAuth token
from the authentication service on every call; the demo page composes a subset
tree with the demo repository.

The whole tree (services + repositories) is built once, on top level, in
`App.tsx` (`AppServices`, under `GoogleOAuthProvider`, because the Google
login-flow bridge is a hook), and provided through `ServicesProvider`.
Underlying components reach the services only through the hooks. Subsets of the
tree are composed the same way in tests (see ADR-0008) and in the demo page.

### Module layout (every service module the same)

```
services/<name>/
  <Name>Port.ts          # input port: interface + domain types
  <Name>Service.ts       # the service (class, deps injected on creation)
  <output port>.ts       # output port(s), if any
  <adapters>.ts          # output adapters / repositories
  <private helpers>.ts   # parser, rooms, event format, …
  index.ts               # the module's whole public API (deep module)
  __tests__/             # unit tests through the public interface
```

Component modules have the same shape (`Component.tsx`, private helpers,
`index.ts`, `__tests__/`). `src/services/index.ts` is the barrel for the service
layer plus the `Services` type describing the tree.

### Consequences

- Good, because there is one way to do things: every module is a component, a
  hook, or a service with ports/adapters; names and layout are predictable.
- Good, because services are plain, React-free objects: any service can be
  unit-tested with fakes, and services compose (calendar → permissions →
  authentication).
- Good, because the composition root makes the dependency flow explicit and
  one-directional: App → hooks → components; services → ports/adapters.
- Bad, because the move touches nearly every file (imports, moves); mitigated by
  keeping behavior identical and the test suite green throughout.

## Validation

- `deno test` (unit + integration, see ADR-0008), `deno lint`,
  `deno fmt --check`, `deno task build` and the CI e2e type-check all pass.
- The E2E suite (ADR-0001) exercises the app end-to-end against the WireMock
  Google API mock, including the unchanged fake-auth localStorage seam.

## Pros and Cons of the Options

### Keep the mixed structure

- Good, because zero churn.
- Bad, because utils/context/config keep drifting apart in setup, testing and
  usage, and the calendar god-module keeps growing.

### Package-by-feature layers (domain/application/infrastructure/ui)

- Good, because feature cohesion is high.
- Bad, because it reintroduces several category kinds and nesting levels the
  proposal explicitly wants to avoid; the app is small enough for one flat list
  of service modules.

### Flat components/hooks/services with ports, adapters, repositories

- Good, because one mental model, deep modules, DI everywhere, and an explicit
  service tree composed in one place.
- Bad, because the one-time move is large and import-heavy.

## More Information

- Refines the placement of the ADR-0004 editability rule: the predicate now
  lives in the permission service (`services/permissions/`), not in the calendar
  adapter.
- Supersedes the module-structure guidance in AGENTS.md ("Module Design",
  "Project Structure") and the layering description in
  [docs/architecture.md](../architecture.md), which are updated to match.
- Testing strategy (central fakes, integration tests, e2e): ADR-0008.
