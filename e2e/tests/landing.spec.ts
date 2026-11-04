import { test } from "@playwright/test";
import { LandingPage } from "../pages/LandingPage.ts";

/**
 * Landing page specs: the front page for visitors who are not signed in.
 * Uses the plain Playwright fixtures on purpose: no fake session is seeded.
 */

/** The three steps, as the landing page words them. */
const STEPS: readonly string[] = [
  "Log in met je Google-account met toegang tot de NYMA-agenda.",
  "Bekijk in één helder overzicht wanneer welke ruimte vrij is.",
  "Boek je ruimte moeiteloos: zonder conflicten en met alle informatie in het juiste formaat.",
];

/** Alt texts of the two overview screenshots. */
const DESKTOP_ALT =
  "Het ruimte-overzicht op desktop: alle ruimtes in kolommen met boekingen en vrije timeslots";
const MOBILE_ALT =
  "Het ruimte-overzicht op mobiel: dezelfde kolommen, horizontaal te swipen";

/** The testing-mode warning and its Signal contact link. */
const TESTING_MODE_TITLE = "boekjehokje is in testmodus";
const SIGNAL_LINK_NAME = "@berkes.69";
const SIGNAL_LINK_HREF =
  "https://signal.me/#eu/9ExllGhqYUgGR5fsZy0lnjIhXRgS-Of1A4oA4mTYJz7HI0Th6OZOfYfLlQ1L6iI9";

/**
 * Given I am a visitor who is not signed in
 * When I open the home page
 * Then I see what boekjehokje is, the three steps, both screenshots of the
 * overview, the sign-in button with links to the FAQ, and a warning that the
 * app is in testing mode and how to get whitelisted
 * So that I understand what the app does and what I need before I log in.
 */
test("Visitor sees the landing page with steps, screenshots and sign-in", async ({ page }) => {
  const landing = await new LandingPage(page).gotoHome();

  await landing.assertShowsSignInInvitation();
  await landing.assertShowsSteps(STEPS);
  await landing.assertShowsTestingModeWarning(
    TESTING_MODE_TITLE,
    SIGNAL_LINK_NAME,
    SIGNAL_LINK_HREF,
  );
  await landing.assertShowsScreenshots([DESKTOP_ALT, MOBILE_ALT]);
  await landing.assertLinksToFaq("Waarom?");
  await landing.assertLinksToFaq("Veelgestelde vragen");
});

/**
 * Given I am a visitor on a phone
 * When I open the home page on a small screen
 * Then the steps and both screenshots are still shown
 * So that I get the same introduction on mobile as on desktop.
 */
test("Visitor on a small screen sees the same landing page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const landing = await new LandingPage(page).gotoHome();

  await landing.assertShowsSignInInvitation();
  await landing.assertShowsSteps(STEPS);
  await landing.assertShowsScreenshots([DESKTOP_ALT, MOBILE_ALT]);
});
