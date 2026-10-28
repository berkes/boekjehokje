import { test } from "@playwright/test";
import { LandingPage } from "../pages/LandingPage.ts";

/**
 * Navigation specs: protected routes. Uses the plain Playwright fixtures
 * on purpose: no fake session is seeded.
 */

/**
 * Given I am not signed in
 * When I open the settings page directly
 * Then I land on the home page with the sign-in invitation
 * So that my profile stays private.
 */
test("User must be signed in to open the settings page", async ({ page }) => {
  const landing = await new LandingPage(page)
    .attemptOpeningSettingsWithoutSigningIn();

  await landing.assertShowsSignInInvitation();
  await landing.assertIsOnHomePage();
});
