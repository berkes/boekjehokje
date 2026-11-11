import { test } from "../fixtures/auth.ts";
import { OverviewPage } from "../pages/OverviewPage.ts";

/**
 * Booking details and editability specs: read-side. The write flows
 * (creating in create-booking.spec.ts, editing and deleting in
 * edit-booking.spec.ts) are covered there against the WireMock mock.
 */

/**
 * Given the week overview shows the booking "Kletshok 04 - Dirk"
 * When I click it
 * Then a sidebar opens describing "Kletshok 04 - Dirk", booked by Dirk
 * (dirk@boekjehokje.test) in the room Kletshok 04 (04 KH), lasting
 * 180 minuten
 * And when I close the sidebar
 * Then the details disappear
 * So that I can see who has a room and when, before planning my own visit.
 */
test("User can view the details of the booking 'Kletshok 04 - Dirk'", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.openBookingDetails("Kletshok 04 - Dirk");
  await overview.assertDetailsDescribe("Kletshok 04 - Dirk");
  await overview.assertShowsBooker("Dirk", "dirk@boekjehokje.test");
  await overview.assertShowsRoomOfBooking("Kletshok 04", "04 KH");
  await overview.assertShowsDuration("180 minuten");

  await overview.closeBookingDetails();
  await overview.assertBookingDetailsAreClosed();
});

/**
 * Given I am signed in as Bèr and the week overview shows my booking
 * "Stilteruimte - Bèr" next to Willem's booking "Kletshok 03 - Willem"
 * When I look at the bookings on the board
 * Then mine offers to edit and delete, and Willem's only offers details
 * So that I cannot accidentally change someone else's booking.
 */
test("User can only edit their own booking 'Stilteruimte - Bèr'", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.assertBookingIsEditable("Stilteruimte - Bèr");
  await overview.assertBookingIsReadOnly("Kletshok 03 - Willem");
});

/**
 * Given the board shows Wednesday with Kletshok 05 double-booked:
 * Fatima 10:00-12:00 and Ozan 11:00-13:00 overlap
 * When I look at Kletshok 05's lane
 * Then both bars of the overlapping pair are marked as conflicting
 * So that I can see the double booking on the board (issue #16).
 */
test("User sees the conflicting bookings of a double-booked room marked", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.assertConflictBookingsIn("Kletshok 05", 2);
});
