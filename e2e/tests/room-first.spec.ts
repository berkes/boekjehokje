import { test } from "../fixtures/auth.ts";
import { OverviewPage } from "../pages/OverviewPage.ts";

/**
 * Room-first specs: start from a room and check its availability.
 */

/**
 * Given the week overview shows all rooms
 * When I hide the room "Kletshok 04" by clicking its chip
 * Then its column and its bookings disappear, while "Kletshok 03 - Willem"
 * stays on the board
 * And when I click the chip again
 * Then "Kletshok 04" returns with its booking "Kletshok 04 - Dirk"
 * So that I can limit the overview to the rooms I care about.
 */
test("User can hide the room 'Kletshok 04' from the overview", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.hideRoom("Kletshok 04");
  await overview.assertRoomIsHidden("Kletshok 04");
  await overview.assertShowsBooking("Kletshok 03 - Willem");

  await overview.showRoom("Kletshok 04");
  await overview.assertRoomIsVisible("Kletshok 04");
  await overview.assertShowsBooking("Kletshok 04 - Dirk");
});

/**
 * Given bookings exist that could not be matched to a room
 * When I look at the overview
 * Then the booking "Werkplaats overleg - Sanne" appears in a separate
 * "Unknown" group, set apart from the named rooms
 * And when I hide that group with its chip
 * Then its column disappears from the board, while the named rooms keep
 * their bookings
 * So that a typo in a booking never makes it invisible, and I can still
 * tuck the odd ones away.
 */
test("User sees unmatched bookings in a separate group", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.assertShowsUnmatchedGroup();
  await overview.assertShowsBooking("Werkplaats overleg - Sanne");

  await overview.hideUnmatchedBookings();
  await overview.assertUnmatchedGroupIsHidden();
  await overview.assertShowsNoBooking("Werkplaats overleg - Sanne");
  await overview.assertShowsBooking("Kletshok 03 - Willem");
});
