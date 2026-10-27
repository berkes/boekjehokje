/**
 * Google API endpoint configuration
 *
 * The base URLs of the Google APIs the app talks to. In production these are
 * the real Google endpoints; in tests and local development they can be
 * overridden with environment variables so the API clients route to a mock
 * service instead, such as the WireMock container of the E2E suite (ADR-0001).
 */

/** Google Calendar API base URL */
export const CALENDAR_API_BASE: string =
  import.meta.env?.VITE_GOOGLE_CALENDAR_API_BASE ||
  "https://www.googleapis.com/calendar/v3";

/** Google People API base URL */
export const PEOPLE_API_BASE: string =
  import.meta.env?.VITE_GOOGLE_PEOPLE_API_BASE ||
  "https://people.googleapis.com/v1";
