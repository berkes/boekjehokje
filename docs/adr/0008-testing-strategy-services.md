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

Chosen option: **all tests and test-utils under `tests/`, in three layers plus a
central fake kit**:

```
tests/
  e2e/           # Playwright suite (ADR-0001), WireMock-mocked Google APIs
  integration/   # two real services composed over the fakes
  unit/          # unit tests mirroring the src path: tests/unit/services/foo/bar.test.ts tests src/services/foo/bar.ts
  utils/         # the central fake kit (test-utils)
```

1. **Central test support** — `tests/utils/` holds the fakes, fixtures and
   test-tree builders: `FakeClock`, `FakeAuthenticationService`,
   `FakeAuthenticationProvider`, `InMemorySessionStorage`,
   `InMemoryKeyValueStore`, `InMemoryBrowserStorage`,
   `FakeCalendarEventRepository` + the `storedEvent` factory, and
   `buildTestServices()` which composes a subset of the real service tree over
   the fakes (the same shape the composition root builds in `App.tsx`). `tests/`
   is not part of the app build (`tsconfig.app.json` only includes `src`).
2. **Unit tests** — `tests/unit/`, mirroring the src path of the module under
   test, through the module's public interface. A unit test exercises one real
   service (or pure module) and injects fakes for everything else — from
   `tests/utils/` when complex, or a simple inline mock when trivial (e.g.
   `{ may: () => false }`).
3. **Integration tests** — `tests/integration/`, composing subsets of actual
   trees: exactly two real services plus fakes for their repositories.
   Currently: calendar service + permission service
   (`calendar-permissions.test.ts`) and authentication service + permission
   service (`authentication-permissions.test.ts`). More than two real services
   in one test is left to e2e.
4. **E2E** — `tests/e2e/`, the Playwright suite (ADR-0001), covers the full tree
   against the WireMock-mocked Google APIs.

Run everything with plain `deno test` (it collects `tests/unit` and
`tests/integration`; the e2e specs are type-checked separately in CI).

### Consequences

- Good, because mocks are built once, centrally; a unit test never depends on
  another service's real behavior or on a repository's state.
- Good, because two-service interaction (e.g. `getDay` marking bookings editable
  via the permission service) is tested with real code on both sides, without
  dragging in the whole tree.
- Bad, because `tests/` adds a top-level directory that must be kept out of the
  app build (it is, via `tsconfig.app.json`).

## Validation

- `deno test` — unit + integration tests pass.
- `deno task build` (`tsconfig.app.json` only includes `src`, so `tests/` is not
  in the app build), `deno lint`, `deno fmt --check` pass; CI type-checks
  `tests/e2e/` and runs the Playwright suite.

## More Information

- Architecture being tested: ADR-0007.
- E2E harness and WireMock Google API mocks: ADR-0001, [docs/e2e.md](../e2e.md).
