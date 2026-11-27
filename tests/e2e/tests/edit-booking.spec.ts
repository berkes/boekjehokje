import { test } from "../fixtures/auth.ts";
import { OverviewPage } from "../pages/OverviewPage.ts";

/**
 * Editing and deleting own bookings (the update/delete write flows of
 * issue #14). The board opens on the fixed Wednesday 28 October 2026
 * (FIXED_NOW, day 2 of the mocked week). My editable booking that day is
 * "Stilteruimte - Bèr" 11:00-14:00; its event id in the WireMock stubs is
 * "Stilteruimte - Bèr-2-11:00".
 */

/** My booking on Wednesday, as the board shows it */
const MY_BOOKING = "Stilteruimte - Bèr";

/** Its event id in the WireMock stubs (summary-day-from) */
const MY_EVENT_ID = "Stilteruimte - Bèr-2-11:00";

/**
 * Given I am signed in as Bèr and the board shows my booking
 * "Stilteruimte - Bèr" on Wednesday 11:00-14:00
 * When I tap it (issue #63: context-aware tap opens the edit form for
 * own bookings, there are no icons anymore)
 * Then the same booking form opens, titled "Boeking bewerken" and prefilled
 * with room "Stilteruimte (SR)", van "2026-10-28T11:00", tot
 * "2026-10-28T14:00", booker "Bèr" and summary preview "SR | Bèr"
 * So that I can adjust my own booking without leaving the app.
 */
test("User can open the edit form prefilled from their own booking", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickEditOn(MY_BOOKING);
  await overview.assertEditFormIsOpen({
    room: "Stilteruimte (SR)",
    from: "2026-10-28T11:00",
    to: "2026-10-28T14:00",
    booker: "Bèr",
    summary: "SR | Bèr",
  });
});

/**
 * Given the edit form is open for my booking "Stilteruimte - Bèr"
 * 11:00-14:00 (Anneke's booking follows at 14:00)
 * When I change Tot to "2026-10-28T13:30", fill in my contact and confirm
 * Then after the undo delay a PATCH is sent to the calendar API for event
 * "Stilteruimte - Bèr-2-11:00" with summary "SR | Bèr", the
 * contact in the description, start "2026-10-28T11:00:00.000Z" and end
 * "2026-10-28T13:30:00.000Z", and the form closes
 * So that my change is saved to the shared calendar (#14).
 */
test("User can save an edited booking, which is patched to the calendar API", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickEditOn(MY_BOOKING);
  await overview.setDateTime("Tot", "2026-10-28T13:30");
  await overview.fillContact("ber@boekjehokje.test");
  await overview.submitEditForm();
  await overview.runPendingActions();

  await overview.assertBookingWasWritten({
    method: "PATCH",
    eventId: MY_EVENT_ID,
    summary: "SR | Bèr",
    description: "ber@boekjehokje.test",
    start: "2026-10-28T11:00:00.000Z",
    end: "2026-10-28T13:30:00.000Z",
  });
  await overview.assertBookingFormIsClosed();
});

/**
 * Given I am signed in as Bèr and the board shows my booking
 * "Stilteruimte - Bèr"
 * When I tap it and press "Verwijderen" in the edit form that opens
 * (issue #63: the delete lives in the form, not on the bar)
 * Then a DELETE is sent to the calendar API for event
 * "Stilteruimte - Bèr-2-11:00" after the undo delay, without any
 * confirmation
 * So that my booking is removed from the shared calendar (#14; the
 * write is queued with a timed undo, issue #36).
 */
test("User can delete their own booking without confirmation", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickDeleteOn(MY_BOOKING);
  await overview.runPendingActions();

  await overview.assertBookingWasDeleted(MY_EVENT_ID);
});
