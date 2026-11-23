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

  await overview.toggleNavigation();
  await overview.assertNavigationIsOpen();

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
 * Given I am on a phone
 * When the week overview loads
 * Then the navigation block is collapsed by default: the chevron is in
 * its closed state and the day buttons are hidden
 * And when I tap the chevron
 * Then the navigation block expands with previous/today/next and the
 * day buttons, styled like on desktop
 * And when I pick "donderdag 29 oktober 2026"
 * Then the board shows that day
 * And when I tap the long date in the header
 * Then the board returns to today
 * So that I can browse the week from the collapsed header on mobile.
 */
test("User can expand the collapsed navigation block on mobile", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.assertNavigationIsClosed();
  await overview.toggleNavigation();
  await overview.assertNavigationIsOpen();
  await overview.assertShowsDay("woensdag 28 oktober 2026");

  await overview.selectDay("donderdag 29 oktober 2026");
  await overview.assertShowsDay("donderdag 29 oktober 2026");

  await overview.tapLongDate("woensdag 28 oktober 2026");
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
 * Given I am on a phone and the board is taller than the screen (the
 * window scrolls, the board has no internal scroll)
 * When I scroll the page down
 * Then the room header row stays stuck below the app bar
 * So that I always know which column I am looking at.
 */
test("User sees the room header row stick while scrolling on mobile", async ({ authedPage }) => {
  // A short viewport, so the page (the only scroller) actually scrolls
  await authedPage.setViewportSize({ width: 390, height: 640 });
  const overview = await new OverviewPage(authedPage).goto();

  await overview.assertRoomHeaderIsSticky();
});
