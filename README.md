# boekjehokje

A simple web app for booking meeting rooms at NYMA Makersplaats.

## What it does

boekjehokje makes it easy to see room availability and book meeting rooms. It
guides users toward available time slots while still allowing direct Google
Calendar usage.

## For users

See room availability and book rooms through an intuitive interface. All data is
stored in Google Calendar, so you can continue using Google Calendar directly if
you prefer.

## Updating the landing page screenshots

The front page shows screenshots of the calendar overview, bundled from
`src/assets/overview-desktop.png` and `src/assets/overview-mobile.png`. Whenever
the app's look changes, retake them:

1. Run `deno task dev`.
2. In the browser, seed a fake session in localStorage under the key
   `boekjehokje_authentication` (see AGENTS.md, "Authentication Architecture";
   user name "Bèr", email ber@boekjehokje.test, `expiresAt` in the future).
3. Open `/demo` and screenshot the board at 1440x900 (desktop) and at 390x844
   with mobile emulation, both at device scale factor 2.
4. Save over `src/assets/overview-desktop.png` and
   `src/assets/overview-mobile.png` and check the front page (`/`).

## For more information

- Workflow details: see [ADR-0002](docs/adr/0002-hybrid-booking-workflow.md)
- Technical stack: see [ADR-0003](docs/adr/0003-pure-frontend-tech-stack.md)
- Architecture overview (diagrams): see [Architecture](docs/architecture.md)
- E2E testing: see [E2E testing](docs/e2e.md)
