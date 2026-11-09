# Task: small-issues batch — #33, #38, #45

Parent issues: [#33](https://github.com/berkes/boekjehokje/issues/33) (remove
review-only FAQ screenshots),
[#38](https://github.com/berkes/boekjehokje/issues/38) (rename GoogleAuth.tsx to
the "authentication" terminology),
[#45](https://github.com/berkes/boekjehokje/issues/45) (link a booking to its
Google Calendar event). Related ADRs:
[ADR-0002](../adr/0002-hybrid-booking-workflow.md) (domain mapping of calendar
events).

## Status

Implemented on branch `vibe/small-batch-33-38-45-b2f8af`, on top of `main`.

## What was built

- **#33**: deleted `docs/screenshots/` (`faq-page.png`,
  `faq-page-expanded.png`), the review artifacts that PR #31 merged by accident.
  Nothing in the app, docs or CI referenced them.
- **#38**: renamed `src/components/GoogleAuth.tsx` to
  `src/components/GoogleAuthentication.tsx`; the button component is now
  `GoogleAuthenticationButton` and the provider re-export is the
  `GoogleAuthenticationWrapper` from `src/services/authentication/` itself (the
  `GoogleAuthWrapper` alias is gone). Call sites updated:
  `src/components/index.ts`, `src/App.tsx`, `src/pages/Landing.tsx`. No e2e or
  doc references to the old names existed outside historical task write-ups.
- **#45**: the domain `Booking` (`src/services/CalendarServicePort.ts`) now
  carries `htmlLink: string | null`, mapped from the Calendar API event's
  `htmlLink` field (`src/utils/types.ts`, `parseEvent` in
  `src/services/parser.ts`, `GoogleCalendarAdapter.toBooking`); the demo adapter
  sets it to `null`. The booking sidebar
  (`src/components/calendar/BookingSidebar.tsx`) renders an "In Google Agenda"
  row with a MUI `Link` (opens in a new tab) for every booking, editable or
  read-only. The URL comes from `bookingCalendarLink` in
  `src/components/calendar/bookingLink.ts`: the event's `htmlLink` when the API
  provides one, otherwise the fallback day view derived from the booking's start
  date, e.g. `https://calendar.google.com/calendar/u/0/r/day/2026/11/12`. No
  `/r/eventedit/<id>` links are built.

## Tests

- Unit (`deno test`, 181 passed): `bookingCalendarLink` (htmlLink passthrough,
  day-view fallback, 1-based unpadded month) in
  `src/components/calendar/__tests__/bookingLink.test.ts`; `parseEvent` keeps
  `htmlLink` (null when absent) in `src/services/__tests__/parser.test.ts`;
  `getDay` keeps `htmlLink` on the booking in
  `src/services/__tests__/CalendarService.test.ts`.
- `deno fmt --check`, `deno lint`, `deno task build` and the CI e2e type-check
  (`deno check e2e/...`) are green. The Playwright suite itself could not run in
  the agent sandbox (no root to install the browser's system libraries; the
  WireMock container has no Docker daemon either); it runs in CI.

## Deliberately out of scope

- #45 e2e assertions and `htmlLink` in the WireMock stubs: the mock events carry
  no `htmlLink`, so the e2e suite exercises the fallback day-view link; the
  primary `htmlLink` path is covered by unit tests. Adding the field to
  `e2e/wiremock/__files/calendar-events.hbs` plus a sidebar assertion can be a
  follow-up.
- Landing page screenshots: the sidebar change is not visible in the overview
  screenshots (`src/assets/overview-*.png` show the board, not an open sidebar),
  so no retake was needed.
