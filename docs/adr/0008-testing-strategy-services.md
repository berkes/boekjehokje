# Test services with central fakes, two-service integration tests, and e2e

|           |                          |
| --------- | ------------------------ |
| Status    | proposed                 |
| Date      | 2026-11-09               |
| Deciders  | berkes                   |
| Consulted | Vibe Code agent          |
| Informed  | boekjehokje contributors |

## Context and Problem Statement

With the service-tree architecture (ADR-0007), services are plain objects with
injected dependencies, so they can be tested without React, a browser, or the
network. But that only works if tests don't each rebuild their own mocks:
duplicated mock construction is how test suites rot. We need one strategy for
unit, integration and e2e tests of the service tree.

## Decision Drivers

- Unit-test any service easily, without the complexities or state of other
  services or of repositories.
- Complex mocks/spies/fakes come from a central set of files, so tests don't
  duplicate building them; simple mocks may be built in the test itself.
- Integration tests cover the interaction of services using both of their actual
  code — but never more than two services in one integration test; e2e covers
  the rest.
- Only test through public interfaces (module `index.ts` / ports), never through
  private items.

## Decision Outcome

Chosen option: **three test layers with a central fake kit**:

1. **Central test support** — `src/testing/` holds the fakes, fixtures and
   test-tree builders: `FakeClock`, `FakeAuthenticationService`,
   `FakeAuthenticationProvider`, `InMemorySessionStorage`,
   `InMemoryKeyValueStore`, `InMemoryBrowserStorage`,
   `FakeCalendarEventRepository` + the `storedEvent` factory, and
   `buildTestServices()` which composes a subset of the real service tree over
   the fakes (the same shape the composition root builds in `App.tsx`). It is
   excluded from the app build (`tsconfig.app.json`) and imported only by tests.
2. **Unit tests** — in each module's `__tests__/`, through the module's public
   interface. A unit test exercises one real service (or pure module) and
   injects fakes for everything else — from `src/testing/` when complex, or a
   simple inline mock when trivial (e.g. `{ may: () => false }`).
3. **Integration tests** — `tests/integration/`, composing subsets of actual
   trees: exactly two real services plus fakes for their repositories.
   Currently: calendar service + permission service
   (`calendar-permissions.test.ts`) and authentication service + permission
   service (`authentication-permissions.test.ts`). More than two real services
   in one test is left to e2e.
4. **E2E** — the Playwright suite (ADR-0001) covers the full tree against the
   WireMock-mocked Google APIs.

Run everything with plain `deno test` (it collects `src/**` and `tests/`; the
e2e specs are type-checked separately in CI).

### Consequences

- Good, because mocks are built once, centrally; a unit test never depends on
  another service's real behavior or on a repository's state.
- Good, because two-service interaction (e.g. `getDay` marking bookings editable
  via the permission service) is tested with real code on both sides, without
  dragging in the whole tree.
- Bad, because `src/testing/` adds a directory that must be kept out of the app
  build.

## Validation

- `deno test` — unit + integration tests pass (197 tests).
- `deno task build` (tsc excludes `src/**/__tests__` and `src/testing`),
  `deno lint`, `deno fmt --check` pass; CI type-checks `e2e/` and runs the
  Playwright suite.

## More Information

- Architecture being tested: ADR-0007.
- E2E harness and WireMock Google API mocks: ADR-0001, [docs/e2e.md](../e2e.md).
