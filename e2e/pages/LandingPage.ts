import { expect, type Page } from "@playwright/test";

/**
 * The landing page: the home page with the sign-in invitation, shown to
 * signed-out visitors and after logging out.
 */
export class LandingPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Open the settings page without a signed-in session: the visit lands
   * on the home page.
   */
  async attemptOpeningSettingsWithoutSigningIn(): Promise<this> {
    await this.page.goto("/settings");
    await this.waitUntilShown();
    return this;
  }

  /**
   * Wait until the landing page is shown.
   */
  async waitUntilShown(): Promise<this> {
    await expect(this.signInInvitation()).toBeVisible();
    return this;
  }

  /**
   * Assert the sign-in invitation is shown.
   */
  async assertShowsSignInInvitation(): Promise<void> {
    await expect(this.signInInvitation()).toBeVisible();
  }

  /**
   * Assert the visit landed on the home page.
   */
  async assertIsOnHomePage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/$/);
  }

  /**
   * The invitation to sign in.
   */
  private signInInvitation() {
    return this.page.getByText("Log in om ruimtes te boeken");
  }
}
