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
 * When I click its edit icon
 * Then the same booking form opens, titled "Boeking bewerken" and prefilled
 * with room "Stilteruimte (Stilteruimte)", van "2026-10-28T11:00", tot
 * "2026-10-28T14:00", booker "Bèr" and summary preview "Stilteruimte | Bèr"
 * So that I can adjust my own booking without leaving the app.
 */
test("User can open the edit form prefilled from their own booking", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickEditOn(MY_BOOKING);
  await overview.assertEditFormIsOpen({
    room: "Stilteruimte (Stilteruimte)",
    from: "2026-10-28T11:00",
    to: "2026-10-28T14:00",
    booker: "Bèr",
    summary: "Stilteruimte | Bèr",
  });
});

/**
 * Given the edit form is open for my booking "Stilteruimte - Bèr"
 * 11:00-14:00 (Anneke's booking follows at 14:00)
 * When I change Tot to "2026-10-28T13:30", fill in my contact and confirm
 * Then a PATCH is sent to the calendar API for event
 * "Stilteruimte - Bèr-2-11:00" with summary "Stilteruimte | Bèr", the
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

  await overview.assertBookingWasWritten({
    method: "PATCH",
    eventId: MY_EVENT_ID,
    summary: "Stilteruimte | Bèr",
    description: "ber@boekjehokje.test",
    start: "2026-10-28T11:00:00.000Z",
    end: "2026-10-28T13:30:00.000Z",
  });
  await overview.assertBookingFormIsClosed();
});

/**
 * Given I am signed in as Bèr and the board shows my booking
 * "Stilteruimte - Bèr"
 * When I click its delete icon
 * Then a DELETE is sent to the calendar API for event
 * "Stilteruimte - Bèr-2-11:00", without any confirmation
 * So that my booking is removed from the shared calendar (#14; a timed
 * undo is issue #36).
 */
test("User can delete their own booking without confirmation", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.clickDeleteOn(MY_BOOKING);

  await overview.assertBookingWasDeleted(MY_EVENT_ID);
});
