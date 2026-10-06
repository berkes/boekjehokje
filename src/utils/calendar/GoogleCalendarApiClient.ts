/**
 * Google Calendar API Client
 *
 * Concrete implementation of CalendarApiClient for Google Calendar API.
 * Uses OAuth token for authentication.
 */

import type { CalendarApiClient } from "./CalendarApiClient.ts";
import type { CalendarListEntry } from "./CalendarApiClient.ts";
import { CalendarApiError } from "../googleCalendarApi.ts";
import type { CalendarEvent } from "../types.ts";

/**
 * NYMA makersplaats room bookings calendar ID
 */
export const CALENDAR_ID = "agendadesmeltkroes@gmail.com";

/**
 * Google Calendar API base URL
 */
const CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";

/**
 * Format a Date for Google Calendar API (ISO 8601)
 */
function formatDateForApi(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Parse response from Google Calendar API
 */
function parseCalendarEvents(apiResponse: unknown): CalendarEvent[] {
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
 * Google Calendar API Client implementation
 *
 * This is the concrete implementation that makes actual HTTP requests
 * to the Google Calendar API.
 */
export class GoogleCalendarApiClient implements CalendarApiClient {
  private accessToken: string;
  private defaultMaxResults: number;

  /**
   * Create a new Google Calendar API client
   *
   * @param accessToken - OAuth 2.0 access token
   * @param defaultMaxResults - Default maximum number of results (default: 2500)
   */
  constructor(accessToken: string, defaultMaxResults: number = 2500) {
    this.accessToken = accessToken;
    this.defaultMaxResults = defaultMaxResults;
  }

  /**
   * Fetch events from a calendar
   */
  async fetchEvents(
    calendarId: string,
    timeMin?: Date,
    timeMax?: Date,
    maxResults: number = this.defaultMaxResults,
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
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        let errorMessage =
          `Google Calendar API request failed: ${response.status} ${response.statusText}`;

        try {
          const errorData = await response.json() as {
            error?: { message?: string };
          };
          if (errorData?.error?.message) {
            errorMessage += ` - ${errorData.error.message}`;
          }
        } catch {
          // Failed to parse error response
        }

        throw new CalendarApiError(errorMessage, response.status);
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
   * List all calendars available to the user
   */
  async listCalendars(): Promise<CalendarListEntry[]> {
    const url = `${CALENDAR_API_BASE}/users/me/calendarList`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
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
}
