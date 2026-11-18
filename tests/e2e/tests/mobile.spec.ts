import { test } from "../fixtures/auth.ts";
import { OverviewPage } from "../pages/OverviewPage.ts";

/**
 * Mobile specs (issue #63): the board in portrait mode on a ~390px-wide
 * phone. The board opens on the fixed Wednesday 28 October 2026
 * (FIXED_NOW).
 */

test.use({ viewport: { width: 390, height: 844 } });

/**
 * Given I am on a phone in portrait mode
 * When the week overview loads
 * Then the board fits the narrow screen without horizontal scrolling
 * And every room column and its bookings are visible, with number-first
 * column headers
 * And the "Unknown" group is hidden by default, with only its chip
 * So that I can read and book rooms in portrait mode.
 */
test("User can read the board in portrait mode without landscape", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.assertBoardFitsViewport();
  await overview.assertShowsAllRooms();
  await overview.assertShowsBooking("Kletshok 03 - Willem");
  await overview.assertUnmatchedGroupIsHidden();
  await overview.assertShowsNoBooking("Werkplaats overleg - Sanne");

  await overview.hideRoom("Kletshok 04");
  await overview.assertRoomIsHidden("Kletshok 04");
  await overview.showRoom("Kletshok 04");
  await overview.assertRoomIsVisible("Kletshok 04");
});

/**
 * Given I am on a phone and the navigation is in the slide-in drawer
 * When I open the menu
 * Then the drawer slides in with the long date, previous/today/next
 * and the day buttons
 * And when I pick "do" (donderdag)
 * Then the board shows that day and the drawer closes
 * And when I reopen the drawer and tap the long date
 * Then the board returns to today and the drawer closes
 * So that I can browse the week with one hand.
 */
test("User can navigate days from the slide-in drawer on mobile", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.assertNavigationDrawerIsClosed();
  await overview.openNavigationMenu();
  await overview.assertNavigationDrawerIsOpen();
  await overview.assertShowsDay("woensdag 28 oktober 2026");

  await overview.selectDayInNavigation("do");
  await overview.assertNavigationDrawerIsClosed();
  await overview.assertShowsDay("donderdag 29 oktober 2026");

  await overview.openNavigationMenu();
  await overview.tapLongDateInNavigation("woensdag 28 oktober 2026");
  await overview.assertNavigationDrawerIsClosed();
  await overview.assertShowsDay("woensdag 28 oktober 2026");
});

/**
 * Given I am on a phone and the board shows my booking
 * "Stilteruimte - Bèr" next to Willem's "Kletshok 03 - Willem"
 * When I tap Willem's booking
 * Then only its details open
 * And when I tap my own booking
 * Then the edit form opens with a "Verwijderen" button
 * And when I press "Verwijderen"
 * Then a DELETE is sent for my booking's event
 * So that I can act on a booking by tapping it, without tiny icons.
 */
test("User can tap bookings context-aware and delete from the edit form on mobile", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.openBookingDetails("Kletshok 03 - Willem");
  await overview.assertDetailsDescribe("Kletshok 03 - Willem");
  await overview.assertNoDeleteButton();
  await overview.closeBookingDetails();

  await overview.clickDeleteOn("Stilteruimte - Bèr");
  await overview.assertBookingWasDeleted("Stilteruimte - Bèr-2-11:00");
});

/**
 * Given I am on a phone and the board is taller than the screen
 * When I scroll the board down
 * Then the room header row stays stuck to the top
 * So that I always know which column I am looking at.
 */
test("User sees the room header row stick while scrolling on mobile", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.assertRoomHeaderIsSticky();
});
