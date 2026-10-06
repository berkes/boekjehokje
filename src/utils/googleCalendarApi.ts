/**
 * Google Calendar API wrapper
 *
 * Low-level wrapper for Google Calendar API calls.
 * Handles authentication, errors, and returns raw API responses.
 */

import type { CalendarEvent } from "./types.ts";

/**
 * Google Calendar API list entry for a calendar
 */
export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
}

/**
 * Google Calendar API error response
 */
export interface GoogleApiError {
  error: {
    code: number;
    message: string;
    status: string;
    details?: Array<{
      domain: string;
      reason: string;
      message: string;
    }>;
  };
}

/**
 * Domain-specific error for calendar API operations
 * Wraps Google API errors to prevent leaking Google-specific details
 */
export class CalendarApiError extends Error {
  public readonly statusCode?: number;
  public readonly originalError?: Error;

  constructor(
    message: string,
    statusCode?: number,
    originalError?: Error,
  ) {
    super(message);
    this.name = "CalendarApiError";
    this.statusCode = statusCode;
    this.originalError = originalError;

    // Maintain proper stack trace
    // Note: Error.captureStackTrace is a Node.js specific feature
    // For browser environments, the stack trace will be set automatically
  }
}

/**
 * NYMA makersplaats room bookings calendar ID
 * This is hardcoded as per requirements.
 */
export const NYMA_ROOM_CALENDAR_ID = "YWdlbmRhZGVzbWVsdGtyb2VzQGdtYWlsLmNvbQ";

/**
 * Google Calendar API base URL
 */
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

/**
 * Format a Date for Google Calendar API (ISO 8601)
 * Google requires RFC3339 format: YYYY-MM-DDTHH:MM:SSZ
 */
function formatDateForApi(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Parse response from Google Calendar API
 * Converts raw API events to our simplified CalendarEvent type
 */
function parseCalendarEvents(apiResponse: unknown): CalendarEvent[] {
  // Validate response structure
  if (!apiResponse || typeof apiResponse !== "object") {
    return [];
  }

  const response = apiResponse as { items?: unknown };

  if (!Array.isArray(response.items)) {
    return [];
  }

  const events: CalendarEvent[] = [];

  for (const item of response.items) {
    if (!item || typeof item !== "object") continue;

    const event = item as {
      id?: string;
      uid?: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      created?: string;
      updated?: string;
      status?: string;
      sequence?: number;
    };

    // Skip if required fields are missing
    if (!event.id || !event.summary) continue;

    events.push({
      id: event.id,
      uid: event.uid || "",
      summary: event.summary,
      start: event.start || {},
      end: event.end || {},
      created: event.created || "",
      updated: event.updated || "",
      status: event.status || "confirmed",
      sequence: event.sequence || 0,
    });
  }

  return events;
}

/**
 * Fetch events from the NYMA room calendar
 *
 * @param accessToken - OAuth 2.0 access token
 * @param calendarId - Calendar ID (defaults to NYMA_ROOM_CALENDAR_ID)
 * @param timeMin - Start of time range (inclusive)
 * @param timeMax - End of time range (exclusive)
 * @param maxResults - Maximum number of events to return (default: 2500)
 * @returns Array of calendar events
 * @throws CalendarApiError on API errors
 */
export async function fetchCalendarEvents(
  accessToken: string,
  calendarId: string = NYMA_ROOM_CALENDAR_ID,
  timeMin?: Date,
  timeMax?: Date,
  maxResults: number = 2500,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: maxResults.toString(),
  });

  if (timeMin) {
    params.set("timeMin", formatDateForApi(timeMin));
  }

  if (timeMax) {
    params.set("timeMax", formatDateForApi(timeMax));
  }

  const url = `${CALENDAR_API_BASE}/calendars/${
    encodeURIComponent(calendarId)
  }/events?${params}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      let errorMessage =
        `Google Calendar API request failed: ${response.status} ${response.statusText}`;
      let errorData: GoogleApiError | null = null;

      try {
        errorData = await response.json();
        if (errorData?.error?.message) {
          errorMessage += ` - ${errorData.error.message}`;
        }
      } catch {
        // Failed to parse error response, use status text
      }

      throw new CalendarApiError(
        errorMessage,
        response.status,
        new Error(response.statusText),
      );
    }

    const data = await response.json();
    return parseCalendarEvents(data);
  } catch (error) {
    if (error instanceof CalendarApiError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new CalendarApiError(
        `Failed to fetch calendar events: ${error.message}`,
        undefined,
        error,
      );
    }

    throw new CalendarApiError(
      "Failed to fetch calendar events: Unknown error",
      undefined,
      new Error(String(error)),
    );
  }
}

/**
 * List all calendars available to the authenticated user
 * Useful for debugging or if we need to support multiple calendars in the future.
 *
 * @param accessToken - OAuth 2.0 access token
 * @returns Array of calendar list entries
 * @throws CalendarApiError on API errors
 */
export async function listCalendars(
  accessToken: string,
): Promise<CalendarListEntry[]> {
  const url = `${CALENDAR_API_BASE}/users/me/calendarList`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new CalendarApiError(
        `Failed to list calendars: ${response.status} ${response.statusText}`,
        response.status,
      );
    }

    const data = await response.json();

    if (!Array.isArray(data?.items)) {
      return [];
    }

    return data.items.map((item: unknown) => {
      if (!item || typeof item !== "object") {
        return { id: "", summary: "" };
      }

      const calendar = item as {
        id?: string;
        summary?: string;
        description?: string;
        primary?: boolean;
      };

      return {
        id: calendar.id || "",
        summary: calendar.summary || "",
        description: calendar.description,
        primary: calendar.primary,
      };
    });
  } catch (error) {
    if (error instanceof CalendarApiError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new CalendarApiError(
        `Failed to list calendars: ${error.message}`,
        undefined,
        error,
      );
    }

    throw new CalendarApiError(
      "Failed to list calendars: Unknown error",
      undefined,
      new Error(String(error)),
    );
  }
}
