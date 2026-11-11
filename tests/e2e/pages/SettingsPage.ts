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
   * Assert the editable booking details (issue #18) show the given
   * booker name and contact.
   */
  async assertShowsBookerDetails(name: string, contact: string): Promise<void> {
    await expect(this.page.getByLabel("Boeker")).toHaveValue(name);
    await expect(this.page.getByLabel("Contact")).toHaveValue(contact);
  }

  /**
   * Fill the editable booker name field.
   */
  async fillBookerName(name: string): Promise<this> {
    await this.page.getByLabel("Boeker").fill(name);
    return this;
  }

  /**
   * Fill the editable contact field.
   */
  async fillContactDetails(contact: string): Promise<this> {
    await this.page.getByLabel("Contact").fill(contact);
    return this;
  }

  /**
   * Save the booking details and wait for the confirmation.
   */
  async saveBookerDetails(): Promise<this> {
    await this.page.getByRole("button", { name: "Opslaan" }).click();
    await expect(
      this.page.getByText("Boekingsgegevens opgeslagen"),
    ).toBeVisible();
    return this;
  }

  /**
   * End the session and return to the landing page.
   */
  async logout(): Promise<LandingPage> {
    await this.page.getByRole("button", { name: "Uitloggen" }).click();
    return await new LandingPage(this.page).waitUntilShown();
  }
}
