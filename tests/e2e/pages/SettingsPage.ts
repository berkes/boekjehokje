import { expect, type Page } from "@playwright/test";
import { LandingPage } from "./LandingPage.ts";

/**
 * The settings page: the profile of the signed-in user.
 */
export class SettingsPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Open the settings page directly.
   */
  async goto(): Promise<this> {
    await this.page.goto("/settings");
    return await this.waitUntilOpen();
  }

  /**
   * Wait until the settings page is shown.
   */
  async waitUntilOpen(): Promise<this> {
    await expect(this.page).toHaveURL(/\/settings$/);
    await expect(
      this.page.getByRole("heading", { name: /Ingelogd als/ }),
    ).toBeVisible();
    return this;
  }

  /**
   * Assert the page shows the profile of the given user.
   */
  async assertShowsProfileOf(
    user: { name: string; email: string },
  ): Promise<void> {
    await expect(
      this.page.getByRole("heading", { name: `Ingelogd als ${user.name}` }),
    ).toBeVisible();
    await expect(this.page.getByText("Naam", { exact: true })).toBeVisible();
    await expect(this.page.getByText("E-mail", { exact: true })).toBeVisible();
    await expect(this.page.getByText(user.email)).toBeVisible();
  }

  /**
   * End the session and return to the landing page.
   */
  async logout(): Promise<LandingPage> {
    await this.page.getByRole("button", { name: "Uitloggen" }).click();
    return await new LandingPage(this.page).waitUntilShown();
  }
}
