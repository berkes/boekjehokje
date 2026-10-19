# Determine editability by creator-email ownership, evaluated in the frontend only

|           |             |
| --------- | ----------- |
| Status    | proposed    |
| Date      | 2026-10-19  |
| Deciders  | Bèr Kessels |
| Consulted |             |
| Informed  |             |

## Context and Problem Statement

Boekjehokje shows all bookings of the NYMA Makersplaats rooms, created by many
different people. Users want to correct or cancel their own bookings without
opening Google Calendar
([issue #13](https://github.com/berkes/boekjehokje/issues/13)), while bookings
made by others must stay read-only so nobody changes a reservation they are not
supposed to change. We must therefore decide, per booking, whether the current
user may edit ("editability"), and where that decision lives — without calling
or updating the Google Calendar API (UI only; persistence is tracked in #14).

## Decision Drivers

- Users may only manage their own bookings; others' bookings must stay
  read-only.
- Google Calendar is the single source of truth; there is no backend of our own.
- The app knows the authenticated user's profile email
  (`useUser().profile.email`).
- The Google Calendar `creator` object exposes the creator's email, which the
  existing `GoogleCalendarApiClient` already maps onto the booking
  (`details.author`).
- This issue is UI-only: no write-back to Google Calendar yet.

## Considered Options

- Ownership predicate on creator email vs. profile email, placed next to the
  parser in the services layer.
- Compare the booker name parsed from the event summary instead of the email.
- Make all events editable without an ownership check.
- Ask the Google Calendar API (e.g. `etag`/`canEdit`) at render time.

## Decision Outcome

Chosen option: "Ownership predicate on creator email vs. profile email, placed
next to the parser in the services layer", because it is the only option that is
accurate (the email is a stable identifier Google itself guarantees), needs no
extra API calls, and keeps the rule out of the components so it can be
unit-tested and reused.

A booking is editable if and only if `booking.details.author`
(case-insensitively, trimmed) equals `profile.email` of the currently
authenticated user, and the user is authenticated. Not authenticated, or an
unknown creator email, means not editable. The predicate lives in
`src/services/editability.ts` (`isEditable(booking, profile)`); components never
inline the comparison. Until persistence (#14) lands, an edit or move only
changes the in-memory state — the Google Calendar API is never called.

### Consequences

- Good, because the rule is testable, explicit and reusable.
- Good, because drag-and-drop and other edit affordances can rely on one
  predicate instead of scattered checks.
- Bad, because events created with an alias email that differs from the profile
  email would be considered read-only even if made by the same person (not
  observed in practice for this Workspace).
- Bad, because until #14 lands, changes are volatile: they disappear on refresh,
  since Google Calendar remains the source of truth.

## Validation

- Unit tests in `src/services/__tests__/editability.test.ts` cover: matching
  email, differing email, case-insensitivity, whitespace, unauthenticated user,
  empty profile email and unknown creator email.
- `deno lint` and `deno check` pass; the calendar only enables
  `eventMoveHandling` for events the predicate accepts.

## Pros and Cons of the Options

### Ownership predicate on creator email vs. profile email, in the services layer

The booking's `details.author` (mapped from Google's `creator.email`) is
compared to the authenticated user's `profile.email`.

- Good, because the email is the exact identifier Google uses for the creator.
- Good, because placing it next to the parser keeps domain rules in the services
  layer, per the module design guidance in AGENTS.md.
- Good, because a pure function is trivially unit-testable.
- Neutral, because the comparison must normalize case and whitespace.

### Compare the booker name parsed from the event summary

- Good, because no extra data is needed.
- Bad, because the summary is free text: names are ambiguous, optional (`booker`
  may be `null`) and localized; "Bèr" can be booked by anyone.
- Bad, because two people can share a name, leading to incorrect edit rights.

### Make all events editable without an ownership check

- Good, because it is the simplest implementation.
- Bad, because anyone could move or delete anyone's booking, which is
  unacceptable for a shared resource calendar.
- Bad, because it contradicts the user story that others' bookings must be
  clearly marked read-only.

### Ask the Google Calendar API at render time

- Good, because the API is authoritative.
- Bad, because it needs extra API round-trips per booking, while the creator
  email is already available in the fetched event.
- Bad, because this issue is UI-only: no calls to the Google Calendar API.

## More Information

- [Issue #13: Make "my" events editable](https://github.com/berkes/boekjehokje/issues/13)
- [Google Calendar API Events resource — `creator.email`](https://developers.google.com/workspace/calendar/api/v3/reference/events#resource)
- DayPilot event moving: <https://doc.daypilot.org/calendar/event-moving/>
