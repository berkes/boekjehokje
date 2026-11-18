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
 * Then the "Unknown" group is hidden by default (issue #63): only its
 * chip shows, and "Werkplaats overleg - Sanne" is not on the board
 * And when I enable the group with its chip
 * Then its column appears, set apart from the named rooms, with the
 * booking on it
 * And when I hide it again with the chip
 * Then its column disappears, while the named rooms keep their bookings
 * So that a typo in a booking never clutters the board, yet stays one
 * tap away.
 */
test("User sees unmatched bookings in a separate group, hidden by default", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.assertUnmatchedGroupIsHidden();
  await overview.assertShowsNoBooking("Werkplaats overleg - Sanne");

  await overview.showRoom("Unknown");
  await overview.assertShowsUnmatchedGroup();
  await overview.assertShowsBooking("Werkplaats overleg - Sanne");

  await overview.hideUnmatchedBookings();
  await overview.assertUnmatchedGroupIsHidden();
  await overview.assertShowsNoBooking("Werkplaats overleg - Sanne");
  await overview.assertShowsBooking("Kletshok 03 - Willem");
});
