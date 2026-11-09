import { defineConfig } from "@playwright/test";

/**
 * Playwright configuration for the boekjehokje E2E suite.
 *
 * Boots the app with the Google API base URLs pointing at the WireMock
 * container (started separately with `deno task test:google-mock`, or by
 * CI). The browser runs in UTC so the week window the app requests aligns
 * with the UTC times the WireMock stubs render.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5174",
    timezoneId: "UTC",
    trace: "on-first-retry",
  },
  webServer: {
    // A dedicated port, so tests never have to touch (or reuse) a dev
    // server that might be running against the real Google APIs.
    command: "deno task dev --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      VITE_GOOGLE_CALENDAR_API_BASE: "http://localhost:8081/calendar/v3",
      VITE_GOOGLE_PEOPLE_API_BASE: "http://localhost:8081/v1",
    },
  },
});
