import { expect, type Page } from "@playwright/test";

/**
 * The landing page: the home page shown to visitors who are not signed in
 * (and after logging out). It explains what boekjehokje is, shows the three
 * steps to book a room, screenshots of the overview and the sign-in button.
 */
export class LandingPage {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Open the home page without a signed-in session.
   */
  async gotoHome(): Promise<this> {
    await this.page.goto("/");
    await this.waitUntilShown();
    return this;
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
    await expect(this.heading()).toBeVisible();
    await expect(this.signInButton()).toBeVisible();
    return this;
  }

  /**
   * Assert the sign-in invitation is shown.
   */
  async assertShowsSignInInvitation(): Promise<void> {
    await expect(this.signInButton()).toBeVisible();
  }

  /**
   * Assert the three steps are shown as a numbered list, in order.
   */
  async assertShowsSteps(steps: readonly string[]): Promise<void> {
    await expect(this.page.getByRole("listitem")).toHaveCount(steps.length);
    for (const step of steps) {
      await expect(this.page.getByText(step)).toBeVisible();
    }
  }

  /**
   * Assert the overview screenshots are shown, by their alt texts.
   */
  async assertShowsScreenshots(altTexts: readonly string[]): Promise<void> {
    for (const alt of altTexts) {
      await expect(this.page.getByAltText(alt)).toBeVisible();
    }
  }

  /**
   * Assert a link with the given name is shown and points at the FAQ page.
   */
  async assertLinksToFaq(name: string): Promise<void> {
    const link = this.page.getByRole("link", { name });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /\/faq$/);
  }

  /**
   * Assert the testing-mode warning is shown, with its link (name and href).
   */
  async assertShowsTestingModeWarning(
    title: string,
    linkName: string,
    linkHref: string,
  ): Promise<void> {
    await expect(this.page.getByRole("alert")).toBeVisible();
    await expect(this.page.getByText(title)).toBeVisible();
    const link = this.page.getByRole("link", { name: linkName });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", linkHref);
  }

  /**
   * Assert the visit landed on the home page.
   */
  async assertIsOnHomePage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/$/);
  }

  /**
   * The landing page's main heading.
   */
  private heading() {
    return this.page.getByRole("heading", { level: 1 });
  }

  /**
   * The Google sign-in button: the primary call to action.
   */
  private signInButton() {
    return this.page.getByRole("button", { name: "Inloggen met Google" });
  }
}
