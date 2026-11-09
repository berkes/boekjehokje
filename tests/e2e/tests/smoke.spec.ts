import { test } from "../fixtures/auth.ts";
import { OverviewPage } from "../pages/OverviewPage.ts";

/**
 * Smoke spec: proves the E2E harness (ADR-0001, Phase 1) end to end — the
 * app boots against the WireMock container, the fake session restores, and
 * the mocked bookings reach the calendar.
 */

/**
 * Given I am signed in and the week overview opens on Wednesday
 * 28 October 2026
 * When I look at the board
 * Then the booking "Kletshok 03 - Willem" shows up in the calendar
 * So that the app's most basic promise — seeing the week's bookings —
 * holds.
 */
test("User sees this week's room bookings in the overview", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.assertShowsBooking("Kletshok 03 - Willem");
  await overview.assertShowsRoom("Kletshok 03");
});
