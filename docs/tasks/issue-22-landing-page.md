# Task: issue #22 — Landing page with three-step introduction for non-logged-in visitors

Parent issue: [#22](https://github.com/berkes/boekjehokje/issues/22) Related
ADRs: [ADR-0002](../adr/0002-hybrid-booking-workflow.md) (the hybrid
overview/booking workflow that steps 2 and 3 describe),
[ADR-0003](../adr/0003-pure-frontend-tech-stack.md) (MUI-based, Dutch, pure
frontend; Google Calendar as source of truth).

## Status

Implemented on branch `vibe/landing-page-a13031`, PR against `main`.

## What was built

- **`src/pages/Landing.tsx`** (exported via `src/pages/index.ts`), rendered by
  `App.tsx` for signed-out visitors in place of the old inline one-liner. Plain
  MUI (`Box`/`Stack`/`Typography`/`List`/`Link` + `sx` only, no custom CSS, no
  cards):
  - Hero: heading "Boek je hokje in de NYMA Makersplaats" plus a short lead
    explaining that boekjehokje turns the shared NYMA Google Calendar into one
    clear overview of all rooms, and that the calendar itself stays usable.
  - The three steps as a numbered MUI `List` (`listStyleType: "decimal"`,
    `ListItem` with `display: "list-item"`), in Dutch and instructive form: "Log
    in met je Google-account met toegang tot de NYMA-agenda." (with a "Waarom?"
    link to `/faq`), "Bekijk in één helder overzicht wanneer welke ruimte vrij
    is.", "Boek je ruimte moeiteloos: zonder conflicten en met alle informatie
    in het juiste formaat."
  - The existing `GoogleAuthButton` as the primary call to action, placed with
    the steps, next to a "Veelgestelde vragen" link to `/faq`.
  - Screenshots of the current calendar overview, desktop and mobile, with Dutch
    alt texts. They stack responsively via `Stack` +
    `useMediaQuery(theme.breakpoints.down("md"))`: side by side on desktop
    (mobile shot at a fixed narrow width), stacked full-width on small screens.
- **Screenshots** in `src/assets/overview-desktop.png` and
  `src/assets/overview-mobile.png`, imported so Vite bundles them. Taken with
  headless Chromium (Playwright) against the `/demo` board with a seeded fake
  session (the mock user "Bèr" from `e2e/fixtures/auth.ts`) and the fixed clock
  (Wednesday 28 October 2026, UTC), viewports 1440x900 and 390x844 at 2x. How to
  retake them is documented in AGENTS.md ("Landing Page Screenshots") and
  README.md.
- **E2E**: `e2e/pages/LandingPage.ts` now speaks the new page (heading, sign-in
  button, steps, screenshot alt texts, FAQ links); new
  `e2e/tests/landing.spec.ts` covers the desktop and the small-screen landing
  page. `navigation.spec.ts` and `settings.spec.ts` keep working through the
  updated `assertShowsSignInInvitation` (the sign-in button).

## Tests

- E2E (`deno task test:e2e`, no WireMock needed for these): `landing.spec.ts`
  asserts the three steps in order, both screenshots by alt text, the "Waarom?"
  and "Veelgestelde vragen" links pointing at `/faq`, and the sign-in button, on
  a 1440px and on a 390px viewport; `navigation.spec.ts`/`settings.spec.ts`
  still pass with the updated page object.
- `deno fmt --check`, `deno lint`, `deno check` (incl. `e2e/`) and
  `deno task build` all pass.

## Deliberately out of scope (per the issue)

- The FAQ page itself: issue #21 (already on `main`).
- Conflict warnings in step 3 (#16) and the booking form (#15, done): step 3
  describes the end state; the screenshots show the current overview and may
  need a refresh once more booking UI lands.
- No marketing carousel/video: static desktop + mobile screenshots, as the issue
  decided.
