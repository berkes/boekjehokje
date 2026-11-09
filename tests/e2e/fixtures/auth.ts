import { expect, type Page, test as base } from "@playwright/test";

/**
 * Fake authenticated session and clock for E2E tests (ADR-0001).
 *
 * The Google Identity Services sign-in popup cannot be redirected to the
 * WireMock container, so tests bypass sign-in by seeding the session that
 * the AuthenticationService restores from localStorage (the documented seam:
 * AUTHENTICATION_STORAGE_KEY = "boekjehokje_authentication").
 */

/**
 * The fixed moment every authenticated test runs at. The app computes its
 * week from the clock, so the board always opens on the same day of the
 * same mocked week and every assertion holds the same value, no matter
 * when the suite runs: Wednesday 28 October 2026.
 */
export const FIXED_NOW = new Date("2026-10-28T10:00:00Z");

/**
 * The mocked user. The email must match the creator email of the editable
 * bookings in the WireMock stubs: editability is decided by creator email
 * vs. profile email (ADR-0004).
 */
export const MOCK_USER = {
  name: "Bèr",
  email: "ber@boekjehokje.test",
} as const;

/** Establish a fake authenticated session before the app loads */
async function seedFakeSession(page: Page): Promise<void> {
  await page.addInitScript((user: { name: string; email: string }) => {
    // Runs inside the browser page, where window exists.
    // deno-lint-ignore no-window
    window.localStorage.setItem(
      "boekjehokje_authentication",
      JSON.stringify({
        user,
        tokens: {
          accessToken: "e2e-mock-access-token",
          tokenType: "Bearer",
          expiresAt: Date.now() + 3_600_000,
        },
      }),
    );
  }, { ...MOCK_USER });
}

/** Fixtures this suite adds on top of Playwright's defaults */
interface AuthFixtures {
  /** A page with a fake authenticated session, at FIXED_NOW */
  authedPage: Page;
}

/** `test` with a fake authenticated session fixture */
export const test = base.extend<AuthFixtures>({
  authedPage: async ({ page }, use) => {
    await page.clock.install({ time: FIXED_NOW });
    await seedFakeSession(page);
    await use(page);
  },
});

export { expect };
