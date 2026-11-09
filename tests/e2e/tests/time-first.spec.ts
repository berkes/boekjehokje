import { test } from "../fixtures/auth.ts";
import { OverviewPage } from "../pages/OverviewPage.ts";

/**
 * Time-first specs: start from a moment in the week and look around.
 */

/**
 * Given the week overview opens on today, Wednesday 28 October 2026
 * When I press "Volgende" or "Vorige"
 * Then the board moves to the next or previous day
 * And when I have wandered off and press "Vandaag"
 * Then the board returns to today
 * So that I can check another day without losing track of today.
 */
test("User can browse the days of the week and return to today", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  await overview.assertShowsDay("woensdag 28 oktober 2026");

  await overview.nextDay();
  await overview.assertShowsDay("donderdag 29 oktober 2026");

  await overview.previousDay();
  await overview.assertShowsDay("woensdag 28 oktober 2026");

  await overview.nextDay();
  await overview.nextDay();
  await overview.assertShowsDay("vrijdag 30 oktober 2026");

  await overview.goToToday();
  await overview.assertShowsDay("woensdag 28 oktober 2026");
});
