# Task: issue #16 — Visual cues for booking conflicts and double bookings

Parent issue: [#16](https://github.com/berkes/boekjehokje/issues/16) Related
ADRs: [ADR-0002](../adr/0002-hybrid-booking-workflow.md) (the app guides
visually, never enforces),
[ADR-0006](../adr/0006-default-click-slot-55-minutes.md) (the five-minute margin
stays a warning; overlap handling changed here from blocked to warned, see the
ADR).

## Status

Implemented on branch `vibe/conflict-warnings-d9d6ca` (PR #47, merged), on top
of `main` with the booking form of issue #15 (which had made overlaps an error
that disabled the confirm button).

## What was built

- **Domain overlap detection**: `findOverlaps(rooms, room, start, end)` in
  `src/services/overlaps.ts`, next to `parser.ts`/`rooms.ts`, exported through
  `src/services/index.ts`. Pure function over plain `Date` values: it returns
  the bookings of the given room whose range overlaps the candidate range
  (`start < booking.end && end > booking.start`, so a zero-minute gap is not an
  overlap), sorted by start. An inverted/empty range or an unknown room overlaps
  nothing. Unit tested in `src/services/__tests__/overlaps.test.ts`.
- **Booking form alerts**: `BookingForm` shows every warning and error as a MUI
  `Alert` (review feedback on PR #47): the overlap warning lists the overlapping
  bookings by booker (or summary) — "Let op: deze boeking overlapt met "Willem"
  in deze ruimte. Je kunt desondanks boeken." — and the confirm button stays
  enabled; the user can always book anyway (guide, do not enforce). The
  zero-margin, long-booking and inverted-range messages and the save error are
  alerts too (`severity="warning"` / `"error"`). While editing a booking, the
  booking being edited never counts as an overlap with itself.
- **Board cues**: `markConflicts` in `src/components/calendar/utils.tsx` marks
  every event whose range overlaps another booking of its room red (issue #16):
  booking bars of existing double bookings (`CONFLICT_EVENT_*`,
  `data-booking-conflict`) as well as free-slot blocks (the selected slot and
  the form's preview block, `FREE_SLOT_CONFLICT_*`, tooltip "Overlapt met een
  bestaande boeking", `data-slot-conflict`). The demo data already carries one
  overlapping pair per weekday, so the demo page shows conflicts on every day;
  the landing page screenshots (`src/assets/overview-*.png`) were retaken
  accordingly (AGENTS.md).
- `checkMargin` in `utils.tsx` now only reports the zero-minute gap (ADR-0006);
  overlap detection lives in the domain (`findOverlaps`).

## Tests

- Unit (`deno test`): `findOverlaps`/`rangesOverlap` in
  `src/services/__tests__/overlaps.test.ts` (overlap, multiple overlaps,
  boundaries, other rooms, unknown room, inverted range, no mutation);
  `checkMargin` zero-gap and `markConflicts` (free-slot blocks and booking
  pairs) in `src/components/calendar/__tests__/utils.test.ts`.
- E2E (`e2e/`, against the WireMock Google API mock): form messages are asserted
  as alerts (`role="alert"`); `create-booking.spec.ts` sets a range overlapping
  Willem's booking and asserts the alert names "Willem", the preview block is
  conflict-marked, the confirm button stays enabled and the booking is still
  written (POST); `booking.spec.ts` asserts both bars of Kletshok 05's double
  booking on Wednesday are conflict-marked (`assertConflictBookingsIn`).
- Landing page screenshots retaken per AGENTS.md (seeded session, FIXED_NOW
  clock, `/demo`, 1440x900 and 430x932 at 2x) so they show the red conflict bars
  of the demo week.

## Deliberately out of scope (per the issue)

- Live feedback _while dragging_ on the board: tracked as follow-up issue
  [#49](https://github.com/berkes/boekjehokje/issues/49). super-calendar's
  `ResourceTimeline` has no selecting callback — only `onCreateEvent` at drag
  end. The conflict cue appears as soon as the range lands in the form (alert)
  and on the board (red preview block).
- Hard blocking of overlapping bookings: rejected per ADR-0002 — users may book
  directly in Google Calendar anyway, so a block in the app only creates a false
  sense of safety. This reverses the issue #15 behavior (overlap error +
  disabled button) into a warning.
