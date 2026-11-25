import { test } from "../fixtures/auth.ts";
import { OverviewPage } from "../pages/OverviewPage.ts";

/**
 * Dashboard specs: the week overview that every visit starts with.
 */

/**
 * Given this week's bookings are loaded
 * When I look at the week overview
 * Then every room appears on the board, with the booking
 * "Kletshok 03 - Willem" on it
 * So that I can see at a glance which rooms are in use, and when.
 */
test("User sees an overview of all rooms and their bookings", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.assertNoEmptyHeader();
  await overview.assertNavigationIsOpen();
  await overview.assertShowsAllRooms();
  await overview.assertShowsBooking("Kletshok 03 - Willem");
});

/**
 * Given the board renders the whole day from 00:00 (so bookings before
 * business hours are possible)
 * When I open the overview, and when I navigate to another day
 * Then the view is scrolled so 08:00 (start of business hours) is at
 * the top, not 00:00
 * So that I don't waste the top of the screen on the empty night hours.
 */
test("User lands scrolled to the start of business hours, not midnight", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();
  await overview.assertScrolledToBusinessHoursStart();

  await overview.nextDay();
  await overview.assertShowsDay("donderdag 29 oktober 2026");
  await overview.assertScrolledToBusinessHoursStart();
});

/**
 * Given the Google Calendar service fails to answer
 * When I open the week overview
 * Then it tells me something went wrong and offers to try again
 * And when I press "Opnieuw proberen" and the service has recovered
 * Then my booking "Kletshok 04 - Dirk" appears after all
 * So that a temporary outage does not leave me stuck without my overview.
 */
test("User can retry when network or API errors occur", async ({ authedPage }) => {
  // Test-harness setup, not a user action: force an outage (ADR-0001).
  await authedPage.route(
    /\/calendar\/v3\/.*\/events/,
    (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: { message: "mock outage" } }),
      }),
  );

  const overview = await new OverviewPage(authedPage).goto();
  await overview.assertShowsError();

  await authedPage.unrouteAll();
  await overview.retryLoading();
  await overview.assertShowsBooking("Kletshok 04 - Dirk");
});
