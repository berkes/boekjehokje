# Task: issue #16 — Visual cues for booking conflicts and double bookings

Parent issue: [#16](https://github.com/berkes/boekjehokje/issues/16) Related
ADRs: [ADR-0002](../adr/0002-hybrid-booking-workflow.md) (the app guides
visually, never enforces),
[ADR-0006](../adr/0006-default-click-slot-55-minutes.md) (the five-minute margin
stays a warning; overlap handling changed here from blocked to warned, see the
ADR).

## Status

Implemented on branch `vibe/conflict-warnings-<hash>`, on top of `main` with the
booking form of issue #15 (which had made overlaps an error that disabled the
confirm button).

## What was built

- **Domain overlap detection**: `findOverlaps(rooms, room, start, end)` in
  `src/services/overlaps.ts`, next to `parser.ts`/`rooms.ts`, exported through
  `src/services/index.ts`. Pure function over plain `Date` values: it returns
  the bookings of the given room whose range overlaps the candidate range
  (`start < booking.end && end > booking.start`, so a zero-minute gap is not an
  overlap), sorted by start. An inverted/empty range or an unknown room overlaps
  nothing. Unit tested in `src/services/__tests__/overlaps.test.ts`.
- **Booking form warning**: `BookingForm` shows a Dutch warning when the draft
  overlaps one or more existing bookings, listing them by booker (or summary):
  "Let op: deze boeking overlapt met "Willem" in deze ruimte. Je kunt desondanks
  boeken." The confirm button stays enabled — the user can always book anyway
  (guide, do not enforce). While editing a booking, the booking being edited
  never counts as an overlap with itself.
- **Board cue**: free-slot blocks (the selected slot and the form's preview
  block) whose range overlaps an existing booking are marked red
  (`markConflictingSlots` in `src/components/calendar/utils.tsx`, conflict
  styles `FREE_SLOT_CONFLICT_*`), with the tooltip "Overlapt met een bestaande
  boeking" and a `data-slot-conflict` attribute.
- `checkMargin` in `utils.tsx` now only reports the zero-minute gap (ADR-0006);
  overlap detection lives in the domain (`findOverlaps`).

## Tests

- Unit (`deno test`): `findOverlaps`/`rangesOverlap` in
  `src/services/__tests__/overlaps.test.ts` (overlap, multiple overlaps,
  boundaries, other rooms, unknown room, inverted range, no mutation);
  `checkMargin` zero-gap and `markConflictingSlots` in
  `src/components/calendar/__tests__/utils.test.ts`.
- E2E (`e2e/tests/create-booking.spec.ts`, against the WireMock Google API
  mock): setting a range that overlaps Willem's booking shows the warning naming
  "Willem", marks the preview block as conflicting
  (`assertConflictSlotIsShownIn`), keeps the confirm button enabled, and
  confirming still writes the booking (POST) to the calendar API.

## Deliberately out of scope (per the issue)

- Live feedback _while dragging_ on the board (the DayPilot
  `onTimeRangeSelecting` suggestion in the issue): super-calendar's
  `ResourceTimeline` has no selecting callback — only `onCreateEvent` at drag
  end — so this is a follow-up if the board ever grows a drag-preview. The
  conflict cue appears as soon as the range lands in the form (warning) and on
  the board (red preview block).
- Hard blocking of overlapping bookings: rejected per ADR-0002 — users may book
  directly in Google Calendar anyway, so a block in the app only creates a false
  sense of safety. This reverses the issue #15 behavior (overlap error +
  disabled button) into a warning.
