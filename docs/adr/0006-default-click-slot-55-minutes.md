# Encourage a five-minute margin between bookings (defaults: whole hour to five to the hour)

|           |                          |
| --------- | ------------------------ |
| Status    | proposed                 |
| Date      | 2026-11-02               |
| Deciders  | Bèr Kessels              |
| Consulted | Vibe Code agent          |
| Informed  | boekjehokje contributors |

## Context and Problem Statement

Users book a room with plain expectations about the times they pick:

- A person booking a room from e.g. 14:00 expects the room to be available at
  14:00, so they can start their meeting exactly at 14:00.
- A person booking a room until 15:00 expects to be able to stay in the room
  until 15:00 exactly, and not have to leave it five minutes before to
  accommodate the next booker.
- Boekjehokje must encourage bookings that allow for a five-minute margin to
  leave and clean the room, and for the next person to settle there.
- As a user, when I book a room, the defaults should encourage booking with a
  margin — but when I choose, I can book without margin, by deliberately
  ignoring a warning.

The rooms are shared, so back-to-back bookings without a gap leave no time to
leave, clean up and let the next group in. Because boekjehokje guides users
visually instead of enforcing rules (see ADR-0002), the margin is encouraged,
never forced.

This ADR is about more than the default for a click or a drag on the calendar
board: it is the business rule for how long we can book, applied whenever a
booking is created or changed — a plain click, a drag selection, manual input in
the booking form, and editing an existing booking (edit flow planned, not yet
implemented, see issue #13) — and then about what the defaults encourage.

## Decision Drivers

- The five-minute margin is encouraged through defaults and warnings, never
  enforced: users must be able to start exactly at their chosen start time and
  stay until exactly their chosen end time.
- Overlapping bookings are warned about, never blocked (issue #16, per ADR-0002:
  users may book directly in Google Calendar anyway); a zero-minute gap between
  consecutive bookings is allowed, but warned about.
- Defaults encourage all bookings to start at the whole hour and to last until
  five minutes before the whole hour.
- One rule covers every way a range can be entered — click, drag, manual input
  and editing — so the warning and the proposal behave the same everywhere.
- The proposal must be predictable: the same free slot always yields the same
  default range.

## Considered Options

- Enforce a hard five-minute margin: bookings without margin are blocked.
- No margin at all: bookings may follow each other back-to-back, silently.
- Encourage a five-minute margin through defaults and a warning, while still
  allowing zero-gap bookings when the user deliberately ignores the warning.

## Decision Outcome

### Business rule: the margin is encouraged, never enforced

- The default margin between consecutive bookings in the same room is 5 minutes.
- Overlapping bookings are warned about, never blocked (updated by issue #16,
  which reversed the original "never allowed" rule: the app guides visually and
  does not enforce, per ADR-0002, so a block in the app would only create a
  false sense of safety — the booking form lists the overlapping bookings and
  the user can confirm anyway). Booking without margin — bookings following with
  0 minutes between them — is allowed, but the app shows a warning, and the user
  can deliberately ignore the warning to book without margin.
- The warning is shown whenever a booking is made without margin, no matter how
  the range was entered: a plain click, a drag selection, manual input in the
  booking form, or editing an existing booking (planned, not yet implemented).
- We neither enforce nor control the input: people will book until whole hours
  or even arbitrary times. After any booking we default to a five-minute margin,
  so the next free slot starts 5 minutes after that booking's end: 5 minutes
  after the whole hour when the booking ends at a whole hour, and 5 minutes
  after the arbitrary time otherwise.

### What the defaults encourage

We encourage all bookings to start at the whole hour and to last until five
minutes before the whole hour. The default proposal for a free slot is:

- A free slot that starts at a whole hour, e.g. 16:00, proposes a booking until
  16:55. The next slot after that starts at 17:00 again, and so forth.
- A booking that goes until the whole hour, e.g. until 14:00, makes the
  following free slot start at 14:05. A booking proposed there goes until 14:55.
- A booking that goes until an arbitrary time, e.g. until 12:15, 13:30 or 14:28,
  still encourages the 5-minute margin, so the next free slot starts at 12:20,
  13:35 or 14:33 respectively. A booking proposed there finishes at five minutes
  before the next whole hour that is longer than 30 minutes away: 13:55, 14:55
  or 15:55 respectively.

A plain click on a free slot proposes that slot's default range. Dragging a free
range still proposes the exact swept range, and manually entered start and end
times are respected as entered; the no-margin warning applies to all of them.

### Consequences

- Good, because users can start exactly when they booked and stay until exactly
  when they booked; the margin is a nudge, not a wall.
- Good, because consecutive bookings in a room have a 5-minute gap by default,
  so people have time to leave, clean up and arrive on time.
- Good, because one business rule covers click, drag, manual input and editing,
  so the warning and the defaults are consistent everywhere.
- Bad, because zero-gap bookings remain possible by deliberate choice, so a
  hand-over can still be tight.
- Bad, because the default proposal depends on the preceding booking's end time,
  so the same visual click position can propose different ranges.

## Pros and Cons of the Options

### Enforce a hard five-minute margin

- Good, because hand-over time between bookings is guaranteed.
- Bad, because users could no longer start exactly at their chosen start time or
  stay until their chosen end time whenever that leaves no margin; the app would
  enforce a rule the user did not choose.

### No margin at all

- Good, because it is the simplest rule and bookings can run back-to-back.
- Bad, because consecutive bookings in a room leave no time to leave, clean up
  and let the next person settle.

### Encourage the margin through defaults and a warning (chosen)

- Good, because the defaults nudge every booking toward a 5-minute margin while
  the user keeps the final say.
- Good, because the warning works the same for click, drag, manual input and
  editing.
- Bad, because zero-gap bookings remain possible, and the warning must be wired
  into every entry path.

## More Information

- [Issue #15: booking form to create a booking from a free slot (click/drag)](https://github.com/berkes/boekjehokje/issues/15)
- [Issue #13: make "my" events editable (the edit flow this rule also covers)](https://github.com/berkes/boekjehokje/issues/13)
- [ADR-0002](0002-hybrid-booking-workflow.md): the app guides users visually and
  does not enforce rules.
