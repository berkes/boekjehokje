import { test } from "../fixtures/auth.ts";
import { OverviewPage } from "../pages/OverviewPage.ts";

/**
 * The timed undo toast (issue #36). The board opens on the fixed
 * Wednesday 28 October 2026 (FIXED_NOW): Kletshok 03 is free at 10:00,
 * and my editable booking that day is "Stilteruimte - Bèr" 11:00-14:00
 * (event id "Stilteruimte - Bèr-2-11:00" in the WireMock stubs).
 *
 * Booking writes are queued, not performed immediately: confirming
 * shows a toast that the action is queued, with an "Ongedaan maken"
 * link, and nothing is written to the calendar API yet. The fixed page
 * clock is paused, so the 30 second delay only passes when the test
 * advances it (runPendingActions): then the write is performed and the
 * result toast shows. Undo cancels every pending action: nothing is
 * written, ever.
 */

/**
 * Given I am signed in as Bèr and the booking form is open for the
 * 10:00 block in Kletshok 03
 * When I fill in my contact and confirm
 * Then a toast shows that the booking is queued ("Boeking \"03 KH\" wordt
 * binnenkort aangemaakt.") with an "Ongedaan maken" link, and no write
 * has reached the calendar API yet
 * When I press "Ongedaan maken"
 * Then the toast shows "Boeking \"03 KH\" aanmaken is geannuleerd."
 * And when the undo delay passes
 * Then still no write was sent to the calendar API
 * So that my accidental booking is never written to the shared calendar.
 */
test("User can undo a queued booking, so nothing is written to the calendar API", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickFreeSlot("Kletshok 03", "10:30");
  await overview.fillContact("ber@boekjehokje.test");
  await overview.submitBookingForm();

  await overview.assertQueuedToastIsShown("03 KH", "create");
  await overview.assertNoCalendarWrites();
  await overview.assertBookingFormIsClosed();

  await overview.clickUndo();
  await overview.assertCancelledToastIsShown("03 KH", "create");

  await overview.runPendingActions();
  await overview.assertNoCalendarWrites();
});

/**
 * Given I am signed in as Bèr and the booking form is open for the
 * 10:00 block in Kletshok 03
 * When I fill in my contact and confirm
 * Then a toast shows that the booking is queued
 * When the undo delay passes
 * Then the booking is written to the calendar API (POST) with summary
 * "03 KH | Bèr", the contact in the description, start
 * "2026-10-28T10:00:00.000Z" and end "2026-10-28T10:55:00.000Z"
 * And the toast shows "Boeking \"03 KH\" is aangemaakt." instead of the
 * queued message
 * So that my booking lands on the shared calendar once the undo window
 * has passed.
 */
test("User sees the queued toast disappear after the delay, the write is performed and the result toast shows", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickFreeSlot("Kletshok 03", "10:30");
  await overview.fillContact("ber@boekjehokje.test");
  await overview.submitBookingForm();
  await overview.assertQueuedToastIsShown("03 KH", "create");

  await overview.runPendingActions();

  await overview.assertBookingWasWritten({
    method: "POST",
    summary: "03 KH | Bèr",
    description: "ber@boekjehokje.test",
    start: "2026-10-28T10:00:00.000Z",
    end: "2026-10-28T10:55:00.000Z",
  });
  await overview.assertPerformedToastIsShown("03 KH", "create");
});

/**
 * Given the board shows my booking "Stilteruimte - Bèr" 11:00-14:00
 * When I press "Verwijderen" in its edit form
 * Then a toast shows that the delete is queued ("Boeking \"SR\" wordt
 * binnenkort verwijderd.") and no DELETE has been sent yet
 * When I press "Ongedaan maken" and the undo delay passes
 * Then still no DELETE was sent and my booking is still on the board
 * So that an accidental delete never reaches the shared calendar.
 */
test("User can undo a queued delete of their own booking", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickDeleteOn("Stilteruimte - Bèr");
  await overview.assertQueuedToastIsShown("SR", "delete");
  await overview.assertNoCalendarWrites();

  await overview.clickUndo();
  await overview.assertCancelledToastIsShown("SR", "delete");

  await overview.runPendingActions();
  await overview.assertNoCalendarWrites();
  await overview.assertShowsBooking("Stilteruimte - Bèr");
});

/**
 * Given the board shows my booking "Stilteruimte - Bèr" 11:00-14:00
 * When I press "Verwijderen" in its edit form and the undo delay passes
 * without me undoing
 * Then a DELETE is sent to the calendar API for event
 * "Stilteruimte - Bèr-2-11:00"
 * And the toast shows "Boeking \"SR\" is verwijderd."
 * So that my booking is removed from the shared calendar after the undo
 * window (#14).
 */
test("A queued delete is performed after the undo delay", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickDeleteOn("Stilteruimte - Bèr");
  await overview.assertQueuedToastIsShown("SR", "delete");

  await overview.runPendingActions();

  await overview.assertBookingWasDeleted("Stilteruimte - Bèr-2-11:00");
  await overview.assertPerformedToastIsShown("SR", "delete");
});
