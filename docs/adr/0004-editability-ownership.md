# Determine editability by creator-email ownership

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
user may edit ("editability"), and where that decision lives.

## Decision Drivers

- Users may only manage their own bookings; others' bookings must stay
  read-only.
- Google Calendar is the single source of truth; there is no backend of our own.
- The app knows the authenticated user's profile email
  (`useUser().profile.email`).
- The Google Calendar `creator` object exposes the creator's email, which the
  existing `GoogleCalendarApiClient` already maps onto the booking
  (`details.author`).

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
(case-insensitively, trimmed) equals `profile.email` of the user the calendar is
served for. Not authenticated, or an unknown creator email, means not editable.
The calendar service (the adapter implementing `CalendarServicePort`, e.g.
`GoogleCalendarAdapter`) decides editability and hands each booking to the
components with an `editable` flag; components never inline the comparison.

### Consequences

- Good, because the rule is testable, explicit and reusable.
- Good, because drag-and-drop and other edit affordances can rely on one
  predicate instead of scattered checks.
- Bad, because events created with an alias email that differs from the profile
  email would be considered read-only even if made by the same person (not
  observed in practice for this Workspace).

## Validation

- Unit tests cover the adapter's editability behaviour: matching email,
  differing email, case-insensitivity and unauthenticated user (see
  `src/services/__tests__/`). The demo adapter hands two bookings per week to
  the profile's user, so editable and read-only states are both visible.
- `deno lint` and `deno check` pass; the calendar only enables event moving for
  events the predicate accepts.

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
- Bad, because anyone could move or delete anyone's booking, which is defeating
  the purpose of the app.
- Bad, because it contradicts the user story that others' bookings must be
  clearly marked read-only.

### Ask the Google Calendar API at render time

- Good, because the API is authoritative about the raw event data.
- Bad, because it needs extra API round-trips per booking, while the creator
  email is already available in the fetched event.
- Bad, because the API carries no business logic about who may edit an event:
  anyone with access can edit any item, so it cannot answer the editability
  question for us.

## More Information

- [Issue #13: Make "my" events editable](https://github.com/berkes/boekjehokje/issues/13)
- [Google Calendar API Events resource — `creator.email`](https://developers.google.com/workspace/calendar/api/v3/reference/events#resource)
- DayPilot event moving: <https://doc.daypilot.org/calendar/event-moving/>
