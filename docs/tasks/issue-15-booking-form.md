# Task: issue #15 — Booking form to create a booking from a free slot

Parent issue: [#15](https://github.com/berkes/boekjehokje/issues/15) Related
ADRs: [ADR-0002](../adr/0002-hybrid-booking-workflow.md) (hybrid workflow, the
form is its confirmation step),
[ADR-0006](../adr/0006-default-click-slot-55-minutes.md) (the five-minute
booking margin, encouraged by defaults and a warning), ADR-0003 (pure frontend,
Google Calendar is the source of truth).

## Status

Implemented on branch `vibe/booking-form-966b3d`, on top of the sidebar shell
refactor (`vibe/sidebar-shell-966b3d`, PR #29). The five-minute margin rule is
ADR-0006 (PR #28).

## What was built

- Slot selection on the board: `onPressCell` (click) and `onCreateEvent` (drag)
  on the super-calendar `ResourceTimeline` in
  `src/components/calendar/Calendar.tsx`. A click opens the form with the
  default slot for that free slot (ADR-0006, `defaultSlotAt` in `utils.tsx`):
  starting at the whole hour, or five minutes after the preceding booking's end
  when that ends later, and ending five to the first whole hour more than 30
  minutes away. A drag opens the form with the exact swept range.
- The five-minute margin rule (ADR-0006) is checked in the form, no matter how
  the range was entered (`checkMargin` in `utils.tsx`): an overlap with an
  existing booking shows an error and disables the confirm button (overlaps are
  never allowed); a zero-minute gap to an adjacent booking shows a warning but
  can be confirmed deliberately.
- The form re-uses the sidebar shell (`SidebarShell`), not a dialog: `Calendar`
  keeps a single sidebar state (`details | create`) and renders `BookingForm`
  for the `create` mode.
- `BookingForm` (`src/components/calendar/BookingForm.tsx`), plain MUI, Dutch
  inline text: room select (all hardcoded rooms except Unknown, shown as "full
  name (short name)", pre-filled from the slot and changeable for the time-first
  flow), "Van"/"Tot" datetime-local fields pre-filled from the selection,
  read-only "Boeker" (the signed-in user's name), editable "Contact" text field
  (last-used value remembered in localStorage via `bookerContact.ts`, until
  issue #18), a read-only live "Samenvatting" preview
  (`[short name] | [booker]`, `summaryPreview` in `utils.tsx`) and a "Boeking
  aanmaken" submit button.
- Saving: `CalendarServicePort.saveBooking(NewBooking)` — a method on the
  service, not on the API client. Both adapters currently only `console.log` the
  event as it is in the service; the conversion to a Google Calendar event and
  the `POST .../events` write belong to issue #14, together with the
  `calendar.events` OAuth scope. After saving, the board refreshes through
  `useCalendar`'s `load()`.

## Tests

- Unit (`deno test`): `defaultSlotFrom` (whole hour + 55 minutes, no mutation),
  `formatDateTimeLocal`, `summaryPreview` in
  `src/components/calendar/__tests__/utils.test.ts`; `saveBooking` logs the
  domain event in `src/services/__tests__/CalendarService.test.ts`;
  `bookerContact` preference round-trip in
  `src/components/calendar/__tests__/bookerContact.test.ts`.
- E2E (`e2e/tests/create-booking.spec.ts`, against the WireMock Google API
  mock): click a free slot opens the pre-filled form; drag opens it with the
  swept range; the room select lists all six rooms without Unknown and the
  summary preview follows the selected room; confirming logs the booking event
  (asserted on the browser console) and closes the form.

## Deliberately out of scope (per the issue)

- No real Google Calendar write yet: `saveBooking` only logs until #14 lands (no
  `calendar.events` scope change on this branch), so against the real API the
  create call would 403 — the e2e mock doesn't care.
- No description field: the summary preview `[short] | [booker]` and the contact
  field carry the standardized format instead.
