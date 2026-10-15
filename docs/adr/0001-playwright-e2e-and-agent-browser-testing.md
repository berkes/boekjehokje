# Use Playwright for E2E testing, with containerized Google API mocks and agent-driven browser tooling

|           |                          |
| --------- | ------------------------ |
| Status    | accepted                 |
| Date      | 2026-10-15               |
| Deciders  | berkes                   |
| Consulted | Vibe Code agent          |
| Informed  | boekjehokje contributors |

## Context and Problem Statement

boekjehokje is a pure-frontend Deno + Vite + React 19 + MUI app that uses Google
OAuth (implicit flow) and the Google Calendar API as its source of truth.
Testing today is limited to unit tests of services and the parser; there is no
E2E or UI testing.

We want three things:

1. A regression suite that captures the app's features (dashboard, room-first
   and time-first booking, settings, protected routes) and checks they remain
   working, runnable in CI without Google credentials.
2. A mock of the Google APIs, running as a service in a container, booted in CI
   before the tests run, so tests exercise our real client code against
   realistic HTTP responses instead of browser-level request interception. Our
   libraries must be able to route to these fake services.
3. Tooling that lets an AI agent open a real browser against the running app,
   click around, take screenshots, and confirm, debug, or troubleshoot — via
   MCP, local CLI, hosted, or otherwise.

Tracking issue: [#11](https://github.com/berkes/boekjehokje/issues/11). The
authentication refactor that makes the OAuth layer unit-testable is tracked
separately in [#12](https://github.com/berkes/boekjehokje/issues/12).

## Decision Drivers

- One tool/API for both deterministic tests and agent-driven browsing keeps
  cognitive and maintenance cost low.
- Tests must run fully offline in CI: no Google accounts, no real OAuth popups,
  no API quota.
- The HTTP behavior of our Google API client code must be tested against
  something that behaves like the real Google endpoints, not just against
  in-browser stubs.
- Must work in a Deno-first repo (`deno task`, `deno install`; no npm scripts).
- Agent tooling must be first-party and actively maintained, and able to produce
  screenshots and read console/network state for troubleshooting.
- UI is Dutch and built on MUI + DayPilot Lite; tests must target these reliably
  (accessibility tree preferred over pixel-based).

## Considered Options

### E2E framework

- Playwright (E2E) + first-party Playwright agent tooling (MCP, CLI + skills)
- Cypress (+ community MCP servers)
- WebdriverIO / Selenium
- Vitest + React Testing Library component tests instead of E2E
- Hosted agent-browser services (Browserbase, Stagehand, Browser Use)
- Chrome DevTools MCP as the agent tool instead of Playwright MCP

### Mocking the Google APIs

- WireMock in a Docker container, stubbing `calendar/v3`, People API, and OAuth
  endpoints ("DIY LocalStack for Google APIs")
- `wiremock/auth-mocks` Docker image (mocked Google Sign-In login APIs)
- Playwright `page.route` request interception (browser-level stubs)
- `NewThingsCo/google-oauth-mock` (REST mock of Google OAuth service)
- Official Google emulators (Pub/Sub, Firestore, Bigtable) — no Calendar or
  People API emulator exists
- MSW (Mock Service Worker) inside the Vite dev server

## Decision Outcome

Chosen options: **Playwright** for the E2E framework and agent tooling, and
**WireMock in a container** as the Google API mock service booted in CI.

### Playwright for E2E and agent browsing

Playwright is the only option that satisfies the E2E and agent goals with one
API: a best-in-class E2E framework (multi-browser, auto-waiting, web-first
assertions, traces, screenshots/videos on failure, codegen, UI mode, `webServer`
config boots the Vite dev server) plus first-party, actively maintained agent
tooling:

- **Playwright MCP** (`@playwright/mcp`, part of playwright-core): agents drive
  the browser through accessibility-tree snapshots (deterministic, no vision
  model needed); navigate/click/type/screenshot/console/network tools;
  persistent profiles keep state between sessions; `--extension` attaches to a
  real Chrome.
- **Playwright CLI + skills** (`@playwright/cli`): token-efficient CLI
  alternative for coding agents.
- **Playwright Agents**: LLM-driven execution loops over Playwright.

Playwright runs in Deno via `deno run -A npm:playwright test`. Caveat:
Deno↔Playwright has hit version-specific breakages (denoland/deno#27623,
denoland/deno#31595); pin a known-good Deno version and keep an
`npx playwright test` fallback documented.

### WireMock as the containerized Google API mock

There is no official Google Calendar or People API emulator, so we run
**WireMock** (`wiremock/wiremock` Docker image) with JSON stub mappings for the
endpoints our client code calls:

- `GET /calendar/v3/calendars/{id}/events` — room bookings with deterministic
  fixtures
- `GET /v1/people/me` (People API profile)
- OAuth token endpoints as needed

WireMock supports stateful stubs, so booking flows can assert the exact
`POST /calendar/v3/.../events` body the app sends, and fault injection for error
handling. The same stubs power integration tests and local development.

**Routing:** our API clients currently hardcode `googleapis.com` base URLs. They
must become configurable (e.g. a `VITE_GOOGLE_API_BASE_URL`-style environment
override read by the client/adapter layer) so that in tests and local
development they route to the WireMock container, and in production to the real
Google endpoints. The authentication anti-corruption layer planned in #12 is the
natural home for the People API and OAuth base URLs; the calendar client follows
the same pattern.

**CI boot order:** the pipeline starts the WireMock container (with the stubs
mounted), waits for its health endpoint, then boots the app with the mock base
URLs configured, then runs `deno task test:e2e`. `page.route` interception
remains available as a complement for edge cases (forcing network failures per
test), but the primary source of truth for Google responses is the container.

**Limitation:** the Google Identity Services sign-in flow (implicit-flow popup
via `@react-oauth/google`) loads from `accounts.google.com` and cannot be
redirected to WireMock. Sign-in is therefore bypassed in tests via a fake
authenticated session established through the authentication service's storage
contract (see #12), while all API traffic after sign-in hits the WireMock
container. `wiremock/auth-mocks` is noted as a candidate should we ever need to
exercise the full OAuth redirect flow.

### Agent-driven browsing setup

Two complementary setups, both local, no hosting required:

MCP client config (Claude Code et al.):

```jsonc
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--browser", "chrome"]
    }
  }
}
```

Capabilities: `browser_navigate` to the dev server, `browser_snapshot`
(accessibility tree) to read the calendar, `browser_click`/`browser_type` to
drive booking flows, `browser_take_screenshot` for visual confirmation,
`browser_console_messages` and `browser_network_requests` for troubleshooting.
`--extension` attaches to the agent's real Chrome (reusing a signed-in session
when needed). With the WireMock container running, an agent gets a fully working
app — including API data — without any real Google dependency.

Token-efficient alternative for coding agents: the Playwright CLI + skills
(`npx playwright init --skills`), which encodes snapshot/click/ screenshot
workflows without MCP schema overhead.

Optional complement: **Chrome DevTools MCP** for network/performance/console
debugging of live API issues.

### Test suite layout

```
e2e/                        # Playwright project (deps via deno install)
  playwright.config.ts      # webServer: deno task dev (or vite preview)
  fixtures/
    auth.ts                 # fake authenticated session via service contract
  tests/
    dashboard.spec.ts       # overview dashboard shows rooms and availability
    room-first.spec.ts      # room -> availability -> book slot
    time-first.spec.ts      # time slot -> available rooms -> book
    booking.spec.ts         # create/edit/delete booking flows
    settings.spec.ts        # settings page, preference persistence
    navigation.spec.ts      # protected routes redirect when signed out
```

Suggested tasks (added to `deno.json`, deps installed with `deno install`):

```jsonc
"test:e2e": "deno run -A npm:playwright test",
"test:e2e:ui": "deno run -A npm:playwright test --ui",
"test:e2e:headed": "deno run -A npm:playwright test --headed",
"test:e2e:debug": "deno run -A npm:playwright test --debug",
"test:google-mock": "docker run --rm -p 8081:8080 -v ./e2e/wiremock/mappings:/home/wiremock/mappings wiremock/wiremock:3x"
```

### Consequences

- Good, because one dependency covers regression testing, agent browsing,
  screenshots, and debugging (traces, console, network via MCP tools).
- Good, because tests exercise our real HTTP client code against a
  Google-API-shaped service instead of browser-level stubs, and booking flows
  can assert the exact requests the app sends.
- Good, because the same WireMock stubs serve CI tests, local development, and
  agent sessions.
- Bad, because Deno↔Playwright has hit version-specific breakages; we must pin a
  known-good Deno version and keep the `npx` fallback.
- Bad, because API clients need configurable base URLs — a code change that must
  land before the E2E harness can use the container (coordinated with #12).
- Bad, because WireMock stubs can drift from the real Google API; fixtures
  should be regenerated from real responses when API usage changes.
- Neutral, because the OAuth sign-in popup itself remains bypassed in tests
  (fake session); the mock container covers everything after sign-in.

## Validation

- Phase 1 delivers a smoke test proving the harness: WireMock container boots,
  the app boots against it with mock base URLs, a fake session is established,
  and mocked calendar events render in the DayPilot calendar.
- CI runs the container, waits for health, then `deno task test:e2e`, and
  uploads the Playwright HTML report artifact; a green run validates the mock
  layer.
- Agent tooling is validated by a documented MCP/CLI setup that can open the app
  against the mock container, drive a booking flow, and take a screenshot.

## Pros and Cons of the Options

### E2E framework options

#### Playwright + first-party agent tooling

Multi-browser, auto-waiting, web-first assertions, traces, screenshots and
videos on failure, codegen, UI mode, `webServer` config. Agent tooling:
Playwright MCP (accessibility snapshots, persistent profiles), CLI + skills,
Playwright Agents.

- Good, because one learning curve and one dependency serve both goals.
- Good, because accessibility-tree driving is deterministic and needs no vision
  model.
- Bad, because Deno↔Playwright version-specific issues exist (mitigated by
  pinning and the `npx` fallback).

#### Cypress (+ community MCP servers)

- Good, because the test-writing experience is polished (time-travel debugging).
- Bad, because single-browser in practice and weaker parallelism.
- Bad, because Node-centric toolchain fits poorly in a Deno repo.
- Bad, because agent/browser-control story is third-party only.

#### WebdriverIO / Selenium

- Good, because W3C WebDriver is a mature standard.
- Bad, because heavier and slower, with no advantage here; agent tooling also
  third-party.

#### Vitest + React Testing Library component tests instead of E2E

- Good, because fast feedback on component behavior.
- Bad, because it does not cover cross-page flows, real rendering, or agent
  browsing — it complements rather than replaces E2E.

#### Hosted agent-browser services (Browserbase, Stagehand, Browser Use)

- Good, because remote runs without local browsers.
- Bad, because SaaS cost and an external dependency for a local-first repo, and
  not a deterministic regression suite.

#### Chrome DevTools MCP as the agent tool

- Good, because strong network/performance/console debugging.
- Bad, because less mature for deterministic testing; kept as a complement.

### Google API mocking options

#### WireMock in a Docker container

"DIY LocalStack for Google APIs": JSON stub mappings mounted into the
`wiremock/wiremock` image; stateful stubs; request assertion; fault injection;
record/playback from real services possible.

- Good, because it tests our real client code over real HTTP, in CI and local
  dev alike.
- Good, because booking assertions can verify exact request bodies.
- Good, because the same stubs serve agent browsing sessions.
- Neutral, because it requires our clients to accept configurable base URLs
  (code change, coordinated with #12).
- Bad, because stubs are hand-maintained and can drift from the real API.

#### wiremock/auth-mocks

Docker image with mocked Google Sign-In login APIs.

- Good, because it simulates the OAuth login flow itself.
- Bad, because our implicit-flow popup comes from Google Identity Services and
  still cannot be redirected; candidate only for future redirect-flow work.

#### Playwright `page.route` interception

Browser-level request stubbing.

- Good, because zero infrastructure; good for per-test fault injection.
- Bad, because it bypasses our HTTP client code's real behavior and does not
  serve local development or agent sessions outside tests.

#### NewThingsCo/google-oauth-mock

REST API mocking the Google OAuth service, Docker image available.

- Good, because ready-made OAuth endpoints.
- Bad, because OAuth-only (no Calendar/People), low maintenance activity, and
  the same redirect limitation applies.

#### Official Google emulators

Google ships emulators for Pub/Sub, Firestore, Bigtable, Spanner; the community
ships `fake-gcs-server` for Cloud Storage.

- Good, because they implement real protocol behavior.
- Bad, because there is no Calendar or People API emulator; not applicable.

#### MSW (Mock Service Worker)

Intercepts requests inside the browser via a service worker.

- Good, because realistic within the browser.
- Bad, because tied to the Vite dev pipeline and the Node/Vitest ecosystem;
  WireMock is simpler and serves non-test use cases too.

## More information

- Playwright MCP docs: <https://playwright.dev/docs/getting-started-mcp>
- WireMock: <https://wiremock.org/>
- wiremock/auth-mocks: <https://github.com/wiremock/auth-mocks>
- Deno↔Playwright issues: denoland/deno#27623, denoland/deno#31595
- navikt/mock-oauth2-server: <https://github.com/navikt/mock-oauth2-server>
- axa-group/oauth2-mock-server:
  <https://github.com/axa-group/oauth2-mock-server>
- chrisw-dev/golang-mock-oauth2-server:
  <https://github.com/chrisw-dev/golang-mock-oauth2-server>
- Dex: <https://dexidp.io/>
- Phasing: (1) WireMock container + configurable client base URLs + harness
  smoke test; (2) feature specs; (3) CI with container boot; (4) agent tooling
  documentation.
- The "no e2e or integration tests needed for now" guidance is superseded by
  this ADR.
- Status moved to accepted after maintainer review (WireMock route confirmed);
  the follow-up implementation work is tracked in #11 and #12.
