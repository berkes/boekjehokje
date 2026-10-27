import { expect, test } from "../fixtures/auth.ts";

/**
 * Smoke test for the E2E harness (ADR-0001, Phase 1): the app boots against
 * the WireMock container, a fake session is restored, and mocked calendar
 * events render in the calendar.
 */
test("mocked calendar events render in the calendar", async ({ authedPage }) => {
  const page = authedPage;
  await page.goto("/");

  // A booking from the WireMock stub renders in the calendar.
  const booking = page.locator('[title="Kletshok 03 - Sanne"]');
  await expect(booking).toBeVisible();

  // The rooms from the stub's bookings are offered as columns.
  await expect(page.getByText("KH 03", { exact: true })).toBeVisible();
});
