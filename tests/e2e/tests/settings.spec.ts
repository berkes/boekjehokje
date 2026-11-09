import { test } from "../fixtures/auth.ts";
import { MOCK_USER } from "../fixtures/auth.ts";
import { OverviewPage } from "../pages/OverviewPage.ts";
import { SettingsPage } from "../pages/SettingsPage.ts";

/**
 * Settings specs: the signed-in user's account page.
 */

/**
 * Given I am signed in
 * When I open the profile menu and choose "Mijn account"
 * Then the settings page shows my name and email address
 * So that I can verify which account I am using.
 */
test("User can view their profile on the settings page", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();

  const settings = await overview.openSettingsViaProfileMenu();
  await settings.assertShowsProfileOf(MOCK_USER);
});

/**
 * Given I am signed in
 * When I press "Uitloggen" on the settings page
 * Then I return to the landing page with the sign-in invitation
 * So that I can end my session, for example on a shared computer.
 */
test("User can log out", async ({ authedPage }) => {
  const settings = await new SettingsPage(authedPage).goto();

  const landing = await settings.logout();
  await landing.assertShowsSignInInvitation();
  await landing.assertIsOnHomePage();
});
