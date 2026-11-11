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
 * Given I am signed in as Bèr, so the booking details are pre-filled from
 * my Google profile
 * When I change my booker name and contact on the settings page and save
 * Then the settings page shows the saved booking details
 * When I open a booking form for the free slot at 10:30 in Kletshok 03
 * Then the form is pre-filled with my booker name "Bèr de Tester" and my
 * contact, and the summary preview shows "03 KH | Bèr de Tester"
 * When I confirm the booking
 * Then the event is written to the calendar API with my name in the
 * summary and my contact in the description
 * So that my bookings carry the details I prefer, not just my Google
 * profile (#18).
 */
test("User can set the name and contact used for their bookings", async ({ authedPage }) => {
  const overview = await new OverviewPage(authedPage).goto();
  const settings = await overview.openSettingsViaProfileMenu();

  await settings.assertShowsBookerDetails(MOCK_USER.name, MOCK_USER.email);
  await settings.fillBookerName("Bèr de Tester");
  await settings.fillContactDetails("bèr@voorbeeld.nl");
  await settings.saveBookerDetails();
  await settings.assertShowsBookerDetails("Bèr de Tester", "bèr@voorbeeld.nl");

  await overview.goto();
  await overview.clickFreeSlot("Kletshok 03", "10:30");
  await overview.assertBookingFormIsOpen({
    room: "Kletshok 03 (03 KH)",
    from: "2026-10-28T10:00",
    to: "2026-10-28T10:55",
    booker: "Bèr de Tester",
    summary: "03 KH | Bèr de Tester",
  });
  await overview.assertContactPrefilled("bèr@voorbeeld.nl");
  await overview.submitBookingForm();

  await overview.assertBookingWasWritten({
    method: "POST",
    summary: "03 KH | Bèr de Tester",
    description: "bèr@voorbeeld.nl",
    start: "2026-10-28T10:00:00.000Z",
    end: "2026-10-28T10:55:00.000Z",
  });
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
