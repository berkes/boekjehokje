# Task: issue #14 — Write operations on Google Calendar events

Parent issue: [#14](https://github.com/berkes/boekjehokje/issues/14) Related
ADRs: [ADR-0003](../adr/0003-pure-frontend-tech-stack.md) (pure frontend, Google
Calendar as source of truth), [ADR-0004](../adr/0004-editability-ownership.md)
(editability by creator email). Architecture diagrams:
[docs/architecture.md](../architecture.md).

## Status

Implemented on branch `vibe/write-calendar-events-53b95b`. The issue was updated
first to add the architecture-diagram deliverable to its scope.

## What was built

- **Port** (`src/utils/calendar/CalendarApiClient.ts`): `CalendarApiClient`
  gains `createEvent(calendarId, draft)`,
  `updateEvent(calendarId, eventId,
  changes)` and
  `deleteEvent(calendarId, eventId)` next to `fetchEvents`. The write shape is
  the new `CalendarEventDraft` in `src/utils/types.ts` (summary, optional
  description, start/end) — the write-side counterpart of `CalendarEvent`.
- **Google client** (`src/utils/calendar/GoogleCalendarApiClient.ts`):
  implements the three operations as `POST .../events`, `PATCH .../events/{id}`
  and `DELETE .../events/{id}` against `CALENDAR_ID`, through one private
  `request` helper that wraps failures in `CalendarApiError` (DELETE's 204 has
  no body to parse). Single-event responses share `parseCalendarEvent` with the
  list parsing.
- **Serializer** (`src/services/parser.ts`): `bookingToEvent` is the inverse of
  `parseEvent`. It writes the standardized event format the parser reads:
  summary `<room short name> | <booker>` (the same string the booking form
  previews), the booker's contact in the `description`, and RFC 3339 start/end.
  Round-trip (serialize → parse → same room/booker/times) is unit tested, for
  one room and for every bookable room.
- **Service port** (`src/services/CalendarServicePort.ts`): `saveBooking` is
  replaced by three operations in domain language — `createBooking(NewBooking)`,
  `updateBooking(BookingUpdate)` (NewBooking + id) and `deleteBooking(id)`.
  Create and update resolve to the `Booking` as the calendar stored it (parsed
  back through `parseEvent`, editability decided as on read); no raw Google
  event shapes leave the adapter.
- **Google adapter** (`src/services/GoogleCalendarAdapter.ts`): serializes with
  `bookingToEvent`, calls the injected client, and parses the response back into
  a `Booking`. `DemoCalendarAdapter` implements the same port, logging only (the
  demo has no calendar source).
- **OAuth scope** (`src/services/authentication/useGoogleLoginFlow.ts`): the
  scope changed from `calendar.readonly` to
  `https://www.googleapis.com/auth/calendar.events`. The issue text pointed at
  `src/components/GoogleAuth.tsx`, but since issue #12 the scopes live in the
  authentication module. **Users must log in again to grant the new scope**;
  existing sessions keep the read-only token until they re-authenticate.
- **Call sites**: `Calendar.tsx` and `DemoCalendar.tsx` call the write
  operations of the port (create, and in the review round also update and
  delete; see below).

## Tests

- Unit (`deno test`): `CalendarService.test.ts` injects a fake
  `CalendarApiClient` (spies) and asserts create/update/delete hit the client
  with the calendar id, the event id and the serialized draft, that the response
  round-trips into a domain `Booking`, and that API errors propagate.
  `parser.test.ts` covers `bookingToEvent` round-trips.
- E2E: new WireMock mappings stub the write endpoints (`POST .../events`,
  `PATCH .../events/{id}`, `DELETE .../events/{id}`, echoing the written event
  via `__files/calendar-event-written.hbs`; CI now uploads all of `__files/`).
  The create-booking specs in `e2e/tests/create-booking.spec.ts` assert the POST
  the app sends, and `e2e/tests/edit-booking.spec.ts` covers the update and
  delete flows (PATCH body, DELETE target) — all via `assertBookingWasWritten` /
  `assertBookingWasDeleted` on the `OverviewPage` page object, which captures
  the write requests instead of console output.

## Review round (PR #35 review)

The PR review asked for the update/delete flows to be usable in the app and
tested, and for the remaining `console.log`s to go:

- The **edit icon** on an own booking now opens the same `BookingForm`,
  prefilled with the booking's room, start and end (title "Boeking bewerken",
  confirm button "Boeking bijwerken"); confirming calls `updateBooking`
  (`BookingUpdate` = `NewBooking` + id) and closes the form.
- The **delete icon** deletes immediately, without confirmation, via
  `deleteBooking(id)`. The timed undo toast is issue #36 and deliberately not
  here.
- `CalendarView` and the demo page wire all three writes through the service
  port and refresh the board afterwards (`useCalendar`'s `load()`).
- All `console.log`/`console.info` calls are gone: the demo adapter resolves
  silently, and the delete path logs failures with `console.error` only.
- New e2e specs: `e2e/tests/edit-booking.spec.ts` (edit form prefilled, PATCH
  sent with the standardized body, DELETE sent without confirmation).

## Deliberately out of scope

- No timed undo for create/update/delete: issue #36.
- No conflict handling or local queue: Google Calendar is the source of truth
  (ADR-0003); a failed write surfaces as an error in the form and the board
  simply re-fetches on the next load.
