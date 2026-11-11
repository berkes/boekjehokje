import { test } from "../fixtures/auth.ts";
import { OverviewPage } from "../pages/OverviewPage.ts";

/**
 * Creating a booking from a free slot (issue #15). The board opens on the
 * fixed Wednesday 28 October 2026 (FIXED_NOW). Free slots are painted as
 * green 55-minute blocks ("Nu boeken") within business hours 08:00-18:00,
 * with a five-minute margin around bookings (ADR-0006). Confirming writes
 * the booking to the (WireMock-mocked) Google Calendar events endpoint in
 * the standardized event format (issue #14).
 *
 * On Wednesday, Kletshok 03 is booked 11:00-13:00 (Willem), 13:00-14:00
 * (Anneke) and 14:00-15:00 (Manon). With the fixed clock at 10:00, the past
 * 08:00 and 09:00 blocks do not render, so its free-slot blocks are
 * 10:00 and 15:05, 16:05, 17:05.
 */

/**
 * All bookable rooms as the form's select shows them: full name with the
 * short name in brackets, without the Unknown group.
 */
const ROOM_OPTIONS = [
  "Kletshok 03 (03 KH)",
  "Kletshok 04 (04 KH)",
  "Kletshok 05 (05 KH)",
  "Stilteruimte (Stilteruimte)",
  "Tuinkamer (TK)",
  "Vergaderruimte C3 (VG C3)",
];

/**
 * Given I am signed in as Bèr and the board shows Wednesday with Kletshok 03
 * free in the morning
 * When I click the green free-slot block at 10:30 in Kletshok 03's column
 * Then the booking form opens in the sidebar, pre-filled with the block
 * "Kletshok 03 (03 KH)", van "2026-10-28T10:00", tot "2026-10-28T10:55",
 * the read-only booker "Bèr" and the summary preview "03 KH | Bèr"
 * So that I can book the room without leaving the app.
 */
test("User can open the booking form by clicking a free-slot block", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickFreeSlot("Kletshok 03", "10:30");

  await overview.assertBookingFormIsOpen({
    room: "Kletshok 03 (03 KH)",
    from: "2026-10-28T10:00",
    to: "2026-10-28T10:55",
    booker: "Bèr",
    summary: "03 KH | Bèr",
  });
  await overview.assertSelectedSlotIsHighlighted("Kletshok 03");
});

/**
 * Given the board paints bookable free slots as green 55-minute blocks
 * (ADR-0006)
 * Then Kletshok 03 on Wednesday shows exactly 4 blocks: 10:00 before the
 * 11:00 booking and 15:05, 16:05, 17:05 after the 15:00 booking - the past
 * 08:00 and 09:00 blocks (before the fixed now of 10:00) and anything
 * outside business hours do not render
 * When I click the 10:00 block
 * Then the form opens with van "2026-10-28T10:00" and tot "2026-10-28T10:55"
 * And when I click the 15:05 block
 * Then the form opens with van "2026-10-28T15:05" and tot "2026-10-28T16:00"
 * So that the margin rules of ADR-0006 are visible on the board.
 */
test("Free slots are painted as 55-minute blocks with margins around bookings", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.assertFreeSlotCount("Kletshok 03", 4);

  await overview.clickFreeSlotBlock("Kletshok 03", 0);
  await overview.assertBookingFormIsOpen({
    room: "Kletshok 03 (03 KH)",
    from: "2026-10-28T10:00",
    to: "2026-10-28T10:55",
    booker: "Bèr",
    summary: "03 KH | Bèr",
  });

  await overview.closeBookingDetails();
  await overview.clickFreeSlotBlock("Kletshok 03", 1);
  await overview.assertBookingFormIsOpen({
    room: "Kletshok 03 (03 KH)",
    from: "2026-10-28T15:05",
    to: "2026-10-28T16:00",
    booker: "Bèr",
    summary: "03 KH | Bèr",
  });
});

/**
 * Given the board shows Wednesday with Kletshok 04 booked until 13:00
 * (a whole hour)
 * When I click the free slot at 13:30 in Kletshok 04's column
 * Then the form proposes the green block starting five minutes after the
 * preceding booking: van "2026-10-28T13:05" and tot "2026-10-28T14:00"
 * So that consecutive bookings keep a five-minute margin by default.
 */
test("Click after a booking ending at the whole hour opens the block with a five-minute margin", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickFreeSlot("Kletshok 04", "13:30");

  await overview.assertBookingFormIsOpen({
    room: "Kletshok 04 (04 KH)",
    from: "2026-10-28T13:05",
    to: "2026-10-28T14:00",
    booker: "Bèr",
    summary: "04 KH | Bèr",
  });
});

/**
 * Given I am signed in as Bèr and the board shows Wednesday
 * When I drag the free range from 18:30 to 19:30 in Kletshok 03's column
 * Then the booking form opens pre-filled with van "2026-10-28T18:30" and
 * tot "2026-10-28T19:30"
 * So that I can book exactly the range I swept.
 */
test("User can open the booking form by dragging a free range", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.dragFreeRange("Kletshok 03", "18:30", "19:30");

  await overview.assertBookingFormIsOpen({
    room: "Kletshok 03 (03 KH)",
    from: "2026-10-28T18:30",
    to: "2026-10-28T19:30",
    booker: "Bèr",
    summary: "03 KH | Bèr",
  });
});

/**
 * Given the booking form is open for Kletshok 03
 * When I open the room select
 * Then it offers all six rooms as "full name (short name)" and no Unknown
 * group
 * And when I pick "Stilteruimte (Stilteruimte)"
 * Then the summary preview updates to "Stilteruimte | Bèr"
 * So that I can book any room for the selected time (time-first, ADR-0002).
 */
test("User can pick another room in the booking form", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickFreeSlot("Kletshok 03", "10:30");
  await overview.assertRoomOptions(ROOM_OPTIONS);

  await overview.selectRoom("Stilteruimte (Stilteruimte)");
  await overview.assertBookingFormIsOpen({
    room: "Stilteruimte (Stilteruimte)",
    from: "2026-10-28T10:00",
    to: "2026-10-28T10:55",
    booker: "Bèr",
    summary: "Stilteruimte | Bèr",
  });
});

/**
 * Given I am signed in as Bèr and the booking form is open for the 10:00
 * block in Kletshok 03, which is booked from 11:00
 * When I set the end time to 11:00, exactly when the next booking starts
 * Then the form warns that there is no five-minute margin (ADR-0006)
 * And when I fill in my contact and confirm anyway
 * Then the booking is written to the calendar API (POST) with summary
 * "03 KH | Bèr", the contact in the description, start
 * "2026-10-28T10:00:00.000Z" and end "2026-10-28T11:00:00.000Z", and the
 * form closes
 * So that I can deliberately book without a margin after seeing the warning.
 */
test("User is warned when booking without a margin, but can still confirm", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickFreeSlotBlock("Kletshok 03", 0);
  await overview.setDateTime("Tot", "2026-10-28T11:00");

  await overview.assertBookingFormIsOpen({
    room: "Kletshok 03 (03 KH)",
    from: "2026-10-28T10:00",
    to: "2026-10-28T11:00",
    booker: "Bèr",
    summary: "03 KH | Bèr",
  });
  await overview.assertMarginWarningIsShown();

  await overview.fillContact("ber@boekjehokje.test");
  await overview.submitBookingForm();
  await overview.assertBookingWasWritten({
    method: "POST",
    summary: "03 KH | Bèr",
    description: "ber@boekjehokje.test",
    start: "2026-10-28T10:00:00.000Z",
    end: "2026-10-28T11:00:00.000Z",
  });
  await overview.assertBookingFormIsClosed();
});

/**
 * Given the booking form is open for Kletshok 03, where Willem's booking
 * "Kletshok 03 - Willem" runs 11:00-13:00
 * When I set the range to 10:30-11:30
 * Then the form warns that the range overlaps that booking, naming it, and
 * the preview block on the board is marked as conflicting
 * And the confirm button stays enabled
 * When I fill in my contact and confirm anyway
 * Then the booking is written to the calendar API (POST) with start
 * "2026-10-28T10:30:00.000Z" and end "2026-10-28T11:30:00.000Z", and the
 * form closes
 * So that I notice the double booking before confirming, but stay free to
 * book anyway (issue #16: the app guides, it does not block).
 */
test("User is warned about an overlap but can still confirm", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickFreeSlotBlock("Kletshok 03", 0);
  await overview.setDateTime("Van", "2026-10-28T10:30");
  await overview.setDateTime("Tot", "2026-10-28T11:30");

  await overview.assertBookingFormIsOpen({
    room: "Kletshok 03 (03 KH)",
    from: "2026-10-28T10:30",
    to: "2026-10-28T11:30",
    booker: "Bèr",
    summary: "03 KH | Bèr",
  });
  await overview.assertOverlapWarningIsShown("Willem");
  await overview.assertConflictSlotIsShownIn("Kletshok 03");
  await overview.assertSubmitIsEnabled();

  await overview.fillContact("ber@boekjehokje.test");
  await overview.submitBookingForm();
  await overview.assertBookingWasWritten({
    method: "POST",
    summary: "03 KH | Bèr",
    description: "ber@boekjehokje.test",
    start: "2026-10-28T10:30:00.000Z",
    end: "2026-10-28T11:30:00.000Z",
  });
  await overview.assertBookingFormIsClosed();
});

/**
 * Given the booking form is open for the 10:00 block in Kletshok 03
 * Then that block is highlighted as the selected slot and no separate
 * preview block is needed
 * When I change the room to Stilteruimte
 * Then a preview block appears in Stilteruimte's lane and not in
 * Kletshok 03's, while the selected highlight stays in Kletshok 03
 * When I hide Stilteruimte's column
 * Then the preview block disappears from the board
 * So that the board always shows what I am booking and where.
 */
test("The board previews the form's draft and drops it for a hidden room", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickFreeSlotBlock("Kletshok 03", 0);
  await overview.assertSelectedSlotIsHighlighted("Kletshok 03");
  await overview.assertNoPreviewSlotIn("Kletshok 03");

  await overview.selectRoom("Stilteruimte (Stilteruimte)");
  await overview.assertPreviewSlotIsShownIn("Stilteruimte");
  await overview.assertNoPreviewSlotIn("Kletshok 03");
  await overview.assertSelectedSlotIsHighlighted("Kletshok 03");

  await overview.hideRoom("Stilteruimte");
  await overview.assertNoPreviewSlotAnywhere();
});

/**
 * Given the booking form is open for Kletshok 03 at 10:00-10:55
 * When I fill in my contact "ber@boekjehokje.test" and confirm the booking
 * Then the booking is written to the calendar API (POST) with summary
 * "03 KH | Bèr", the contact in the description, start
 * "2026-10-28T10:00:00.000Z" and end "2026-10-28T10:55:00.000Z", and the
 * form closes
 * So that my booking is registered on the shared calendar (#14).
 */
test("User can confirm a booking, which is written to the calendar API", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickFreeSlot("Kletshok 03", "10:30");
  await overview.fillContact("ber@boekjehokje.test");
  await overview.submitBookingForm();

  await overview.assertBookingWasWritten({
    method: "POST",
    summary: "03 KH | Bèr",
    description: "ber@boekjehokje.test",
    start: "2026-10-28T10:00:00.000Z",
    end: "2026-10-28T10:55:00.000Z",
  });
  await overview.assertBookingFormIsClosed();
});

/**
 * Given the booking form is open for the 10:00 block in Kletshok 03
 * Then all other free-slot blocks are disabled
 * When I click another free-slot block (15:05) or bare lane space (09:30)
 * Then the form still shows van "2026-10-28T10:00" and tot "2026-10-28T10:55"
 * And when I close the form
 * Then the free-slot blocks are clickable again
 * So that I never lose my form edits by clicking elsewhere on the board.
 */
test("While the booking form is open, other slots are disabled and do nothing", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickFreeSlotBlock("Kletshok 03", 0);
  await overview.assertBookingFormIsOpen({
    room: "Kletshok 03 (03 KH)",
    from: "2026-10-28T10:00",
    to: "2026-10-28T10:55",
    booker: "Bèr",
    summary: "03 KH | Bèr",
  });
  await overview.assertAllSlotsDisabled("Kletshok 03");

  await overview.clickFreeSlotBlock("Kletshok 03", 1);
  await overview.clickFreeSlot("Kletshok 03", "09:30");
  await overview.assertBookingFormIsOpen({
    room: "Kletshok 03 (03 KH)",
    from: "2026-10-28T10:00",
    to: "2026-10-28T10:55",
    booker: "Bèr",
    summary: "03 KH | Bèr",
  });

  await overview.closeBookingDetails();
  await overview.assertNoSlotIsDisabled("Kletshok 03");
});

/**
 * Given the booking form is open for a block in Vergaderruimte C3, which is
 * free from 13:05
 * When I set the range to 13:05-17:30 (longer than 3 hours)
 * Then the form shows a "Let op: deze boeking is erg lang" warning, but the
 * confirm button stays enabled
 * So that long bookings are allowed, just flagged.
 */
test("User is warned when the booking is longer than 3 hours, but can still confirm", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickFreeSlotBlock("Vergaderruimte C3", 0);
  await overview.setDateTime("Van", "2026-10-28T13:05");
  await overview.setDateTime("Tot", "2026-10-28T17:30");

  await overview.assertLongBookingWarningIsShown();
  await overview.assertSubmitIsEnabled();
});

/**
 * Given the booking form is open for the 10:00 block in Kletshok 03
 * When I set Van to 11:00 and Tot to 10:00
 * Then the form warns that Van must be before Tot and the confirm button is
 * disabled
 * So that I cannot save an inverted time range.
 */
test("User cannot confirm when Van is not before Tot", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickFreeSlotBlock("Kletshok 03", 0);
  await overview.setDateTime("Van", "2026-10-28T11:00");
  await overview.setDateTime("Tot", "2026-10-28T10:00");

  await overview.assertInvertedRangeWarningIsShown();
  await overview.assertSubmitIsDisabled();
});
