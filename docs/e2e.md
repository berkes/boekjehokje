# End-to-end testing

The E2E suite runs the real app in a real browser against a WireMock container
that mocks the Google Calendar and People APIs, so it runs fully offline: no
Google accounts, no OAuth popups, no quota. The design decisions live in
[ADR-0001](./adr/0001-playwright-e2e-and-agent-browser-testing.md).

## Running the suite

Two terminals:

```
deno task test:google-mock   # terminal 1: the WireMock container on :8081
deno task test:e2e          # terminal 2: the Playwright suite
```

Playwright boots the app itself (`webServer` in `e2e/playwright.config.ts`) as a
dedicated dev server on port 5174, with the Google API base URLs pointed at the
container. A dev server on 5173 is left untouched.

In CI (`.github/workflows/build.yml`, job `e2e`) the mock runs as a service
container. Service containers start before the checkout, so the stubs cannot be
mounted from the repository; a job step uploads them through WireMock's admin
API instead (`PUT /__admin/files/...` for the response template,
`POST /__admin/mappings` for the mappings).

## How the harness works

- **Configurable base URLs** — `src/config/googleApi.ts` reads
  `VITE_GOOGLE_CALENDAR_API_BASE` and `VITE_GOOGLE_PEOPLE_API_BASE` and defaults
  to the real Google endpoints. The suite overrides them to
  `http://localhost:8081`.
- **WireMock stubs** — `e2e/wiremock/` holds the mappings (calendar events,
  People API, and a CORS preflight; the browser preflights the `Authorization`
  header) and a Handlebars template (`__files/calendar-events.hbs`) that renders
  the bookings. The bookings transcribe the current-week demo content of
  `src/services/DemoCalendarAdapter.ts`; dates are not hardcoded but templated
  relative to the Monday the app requests (`timeMin`), so week navigation in the
  UI keeps hitting the same pattern.
- **Fake session** — the `authedPage` fixture seeds the session the
  AuthenticationService restores from localStorage
  (`boekjehokje_authentication`, the seam documented in AGENTS.md). The mocked
  user is Bèr (`ber@boekjehokje.test`); bookings created by that email are the
  ones the app renders as editable (ADR-0004).
- **Fixed clock** — the fixture also pins the browser clock
  (`page.clock.install`) to `FIXED_NOW` in `e2e/fixtures/auth.ts`: Wednesday 28
  October 2026, 10:00 UTC. The app computes its week from the clock, so it
  always requests the same week, the stubs always render the same bookings, and
  the board always opens on the same Wednesday.

## Writing specs

The conventions, in short:

- Every test has a **user-story comment** (Given/When/Then, plus a "So that ..."
  line) and a **user-view title**, e.g.
  `User can view the details of the booking 'Kletshok 04 - Dirk'`.
- The **test body reads like the story**: Given is the setup and `goto()`, When
  are actions (`openBookingDetails`, `hideRoom`, `nextDay`), Then are `assert*`
  methods — one line per step.
- **Page objects** (`e2e/pages/`) hold the state of the visit and speak the
  app's domain language: rooms, bookings, days. Selectors, Dutch labels, and the
  shapes of expected strings live in the page objects — never in the tests.
  Actions may contain intermediate expectations (they must bubble up so the
  runner reports them); assertions hold the detailed `expect` calls.
- **Assertions are explicit.** Tests pass the concrete strings they expect —
  booking names, bookers, durations, day labels. Never parse page content and
  assert against the parsed value: a wrong or empty value would make the test
  pass while testing nothing.
- **Assertions are reproducible.** Because the clock is fixed, every assertion
  holds the same value no matter when the suite runs. If the WireMock seeds
  change, the expected strings in the tests change with them.
- **Booking specs are read-side only** until write flows are finalized (issue
  #14): no creating, editing, deleting, or dragging.

`deno lint` and `deno fmt --check` cover `e2e/` together with the rest of the
repository. Type-checking does not: `deno task build` (tsc) only covers `src`,
so the suite gets its own `deno check` in CI (and locally:
`deno
check e2e/playwright.config.ts e2e/fixtures/auth.ts e2e/pages/*.ts
e2e/tests/*.spec.ts`).

## Agent-driven browsing

With the mock container running and the app booted against it
(`VITE_GOOGLE_CALENDAR_API_BASE=http://localhost:8081/calendar/v3
VITE_GOOGLE_PEOPLE_API_BASE=http://localhost:8081/v1 deno task dev`),
an agent gets a fully working app without any real Google dependency.

Playwright MCP, in the agent's client config:

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

- `browser_navigate` to the dev server, `browser_snapshot` (the accessibility
  tree, no vision model needed) to read the calendar,
  `browser_click`/`browser_type` to drive a booking flow,
  `browser_take_screenshot` for visual confirmation, `browser_console_messages`
  and `browser_network_requests` for troubleshooting.
- Sign-in is bypassed the same way the tests do it: seed the session in the
  browser's localStorage before the app loads:

  ```js
  localStorage.setItem(
    "boekjehokje_authentication",
    JSON.stringify({
      user: { name: "Bèr", email: "ber@boekjehokje.test" },
      tokens: {
        accessToken: "agent-session",
        tokenType: "Bearer",
        expiresAt: Date.now() + 3_600_000,
      },
    }),
  );
  ```

A token-efficient CLI alternative for coding agents is Playwright's CLI + skills
(`npx playwright init --skills`).

## Maintenance notes

- **Pinned versions** — the suite runs on Deno 2.9.7 with `@playwright/test`
  1.64.1, a combination verified to work (Deno and Playwright have hit
  version-specific breakages: denoland/deno#27623, denoland/deno#31595). CI pins
  the Deno version. The documented fallback is
  `npx playwright test --config e2e/playwright.config.ts`.
- **Stub drift** — the stubs model the real Google APIs by hand. When the client
  code starts calling new endpoints or fields, regenerate the fixtures from real
  responses. The stub data derives from the demo bookings; when the seeds
  change, remember that the specs assert concrete strings and update them
  together.
- **UI changes** — when labels, selectors or structures change, only the page
  objects change; the tests keep describing the user's story.
