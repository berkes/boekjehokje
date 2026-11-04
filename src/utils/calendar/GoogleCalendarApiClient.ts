/**
 * Google Calendar API Client
 *
 * Concrete implementation of CalendarApiClient for Google Calendar API.
 * Uses OAuth token for authentication.
 */

import type { CalendarApiClient } from "./CalendarApiClient.ts";
import type { CalendarListEntry } from "./CalendarApiClient.ts";
import { CALENDAR_API_BASE } from "../../config/googleApi.ts";
import { CalendarApiError } from "../googleCalendarApi.ts";
import type { CalendarEvent, CalendarEventDraft } from "../types.ts";

/**
 * NYMA makersplaats room bookings calendar ID
 */
export const CALENDAR_ID = "agendadesmeltkroes@gmail.com";

/**
 * Format a Date for Google Calendar API (ISO 8601)
 */
function formatDateForApi(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Parse one event item from a Google Calendar API response
 */
function parseCalendarEvent(item: unknown): CalendarEvent | null {
  if (!item || typeof item !== "object") return null;

  const event = item as {
    id?: string;
    uid?: string;
    summary?: string;
    creator?: { email?: string };
    start?: { dateTime?: string; date?: string };
    end?: { dateTime?: string; date?: string };
    created?: string;
    updated?: string;
    status?: string;
    sequence?: number;
  };

  if (!event.id || !event.summary) return null;

  return {
    id: event.id,
    uid: event.uid || "",
    summary: event.summary,
    creator: event.creator || {},
    start: event.start || {},
    end: event.end || {},
    created: event.created || "",
    updated: event.updated || "",
    status: event.status || "confirmed",
    sequence: event.sequence || 0,
  };
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
    const event = parseCalendarEvent(item);
    if (event) {
      events.push(event);
    }
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

    const data = await this.request(url, "fetch calendar events", {
      method: "GET",
    });
    return parseCalendarEvents(data);
  }

  /**
   * Create a new event on a calendar (POST .../events)
   */
  async createEvent(
    calendarId: string,
    event: CalendarEventDraft,
  ): Promise<CalendarEvent> {
    const url = this.eventsUrl(calendarId);
    const data = await this.request(url, "create calendar event", {
      method: "POST",
      body: JSON.stringify(event),
    });
    return this.parseSingleEvent(data, "create calendar event");
  }

  /**
   * Update an existing event (PATCH .../events/{eventId})
   */
  async updateEvent(
    calendarId: string,
    eventId: string,
    changes: CalendarEventDraft,
  ): Promise<CalendarEvent> {
    const url = `${this.eventsUrl(calendarId)}/${encodeURIComponent(eventId)}`;
    const data = await this.request(url, "update calendar event", {
      method: "PATCH",
      body: JSON.stringify(changes),
    });
    return this.parseSingleEvent(data, "update calendar event");
  }

  /**
   * Delete an event (DELETE .../events/{eventId})
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    const url = `${this.eventsUrl(calendarId)}/${encodeURIComponent(eventId)}`;
    await this.request(url, "delete calendar event", { method: "DELETE" });
  }

  /**
   * List all calendars available to the user
   */
  async listCalendars(): Promise<CalendarListEntry[]> {
    const url = `${CALENDAR_API_BASE}/users/me/calendarList`;

    const data = await this.request(url, "list calendars", { method: "GET" });
    const items = (data as { items?: unknown } | null)?.items;

    if (!Array.isArray(items)) {
      return [];
    }

    return items.map((item: unknown) => {
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
  }

  /**
   * The URL of the events collection of a calendar
   */
  private eventsUrl(calendarId: string): string {
    return `${CALENDAR_API_BASE}/calendars/${
      encodeURIComponent(calendarId)
    }/events`;
  }

  /**
   * Perform an authenticated request against the Google Calendar API and
   * return the parsed JSON body, wrapping failures in CalendarApiError
   */
  private async request(
    url: string,
    action: string,
    init: RequestInit,
  ): Promise<unknown> {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          ...init.headers,
        },
      });

      if (!response.ok) {
        let errorMessage =
          `Failed to ${action}: ${response.status} ${response.statusText}`;

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

      // DELETE answers 204 No Content, with no body to parse
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof CalendarApiError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new CalendarApiError(
          `Failed to ${action}: ${error.message}`,
          undefined,
          error,
        );
      }

      throw new CalendarApiError(
        `Failed to ${action}: Unknown error`,
        undefined,
        new Error(String(error)),
      );
    }
  }

  /**
   * Parse a single-event response, failing loudly when the calendar did
   * not return a usable event
   */
  private parseSingleEvent(data: unknown, action: string): CalendarEvent {
    const event = parseCalendarEvent(data);
    if (!event) {
      throw new CalendarApiError(
        `Failed to ${action}: the calendar returned no event`,
      );
    }
    return event;
  }
}
