/**
 * Google Calendar repository adapter
 *
 * The repository that fulfils the CalendarEventRepositoryPort with the
 * real NYMA calendar: it makes the REST calls
 * (GET/POST/PATCH/DELETE .../calendars/{id}/events) and translates between
 * the port's neutral event language (StoredEvent / EventDraft) and Google's
 * JSON shapes (googleShapes.ts). This is the only module that knows Google's
 * URL layout, auth header and response shapes.
 *
 * The calendar ID and the API base URL are fixed at creation; the OAuth
 * access token is read from the authentication service on every call, so
 * the adapter never goes stale when the session changes.
 */

import type { AuthenticationServicePort } from "../authentication/AuthenticationServicePort.ts";
import { CalendarApiError } from "./CalendarApiError.ts";
import type {
  CalendarEventRepositoryPort,
  EventDraft,
  StoredEvent,
} from "./CalendarEventRepositoryPort.ts";
import type { DayRange } from "./CalendarServicePort.ts";
import type {
  GoogleCalendarEvent,
  GoogleCalendarEventDraft,
} from "./googleShapes.ts";

/**
 * NYMA makersplaats room bookings calendar ID
 */
export const CALENDAR_ID = "agendadesmeltkroes@gmail.com";

/**
 * Google Calendar API base URL. In production this is the real endpoint;
 * in tests and local development it can be overridden with an environment
 * variable so the calls route to a mock service instead, such as the
 * WireMock container of the E2E suite (ADR-0001).
 */
const CALENDAR_API_BASE: string =
  import.meta.env?.VITE_GOOGLE_CALENDAR_API_BASE ||
  "https://www.googleapis.com/calendar/v3";

/**
 * Default maximum number of events fetched per day range
 */
const DEFAULT_MAX_RESULTS = 2500;

/**
 * The dependencies of the Google Calendar repository adapter, passed in
 * on creation
 */
export interface GoogleCalendarRepositoryAdapterDeps {
  /** The calendar ID to read/write events on */
  calendarId: string;
  /** The authentication service, providing the OAuth access token per call */
  authentication: AuthenticationServicePort;
  /** API base URL override (defaults to the Google Calendar API base) */
  baseUrl?: string;
}

/**
 * Format a Date for Google Calendar API query parameters (ISO 8601)
 */
function formatDateForApi(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Parse one Google date/time field into a Date: dateTime when present,
 * else an all-day date at UTC midnight
 */
function parseGoogleDate(field: { dateTime?: string; date?: string }): Date {
  return field.dateTime
    ? new Date(field.dateTime)
    : new Date((field.date ?? "") + "T00:00:00Z");
}

/**
 * Map a Google Calendar event resource onto the neutral StoredEvent
 */
function toStoredEvent(event: GoogleCalendarEvent): StoredEvent {
  return {
    id: event.id,
    uid: event.uid || "",
    summary: event.summary,
    htmlLink: event.htmlLink ?? null,
    creatorEmail: event.creator.email || "onbekend",
    start: parseGoogleDate(event.start),
    end: parseGoogleDate(event.end),
    created: new Date(event.created),
    status: event.status,
    sequence: event.sequence || 0,
  };
}

/**
 * Serialize an EventDraft into the Google Calendar API request body
 */
function toGoogleDraft(draft: EventDraft): GoogleCalendarEventDraft {
  return {
    summary: draft.summary,
    description: draft.description,
    start: { dateTime: draft.start.toISOString() },
    end: { dateTime: draft.end.toISOString() },
  };
}

/**
 * Parse one event item from a Google Calendar API response; items without
 * id or summary are not usable events and yield null
 */
function parseGoogleEvent(item: unknown): GoogleCalendarEvent | null {
  if (!item || typeof item !== "object") return null;

  const event = item as {
    id?: string;
    uid?: string;
    summary?: string;
    htmlLink?: string;
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
    htmlLink: event.htmlLink,
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
 * Parse an events-list response body
 */
function parseGoogleEvents(apiResponse: unknown): GoogleCalendarEvent[] {
  if (!apiResponse || typeof apiResponse !== "object") {
    return [];
  }

  const response = apiResponse as { items?: unknown };

  if (!Array.isArray(response.items)) {
    return [];
  }

  const events: GoogleCalendarEvent[] = [];

  for (const item of response.items) {
    const event = parseGoogleEvent(item);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Google Calendar repository adapter
 *
 * Implements the CalendarEventRepositoryPort over the Google Calendar REST
 * API, using the OAuth access token from the authentication service.
 */
export class GoogleCalendarRepositoryAdapter
  implements CalendarEventRepositoryPort {
  private calendarId: string;
  private authentication: AuthenticationServicePort;
  private baseUrl: string;

  /**
   * Create a new Google Calendar repository adapter
   *
   * @param deps - The injected dependencies: calendar ID, authentication
   *               service and an optional API base URL override
   */
  constructor(deps: GoogleCalendarRepositoryAdapterDeps) {
    this.calendarId = deps.calendarId;
    this.authentication = deps.authentication;
    this.baseUrl = deps.baseUrl ?? CALENDAR_API_BASE;
  }

  /**
   * Fetch the events overlapping the given day range
   */
  async fetchEvents(range: DayRange): Promise<StoredEvent[]> {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: DEFAULT_MAX_RESULTS.toString(),
      timeMin: formatDateForApi(range.start),
      timeMax: formatDateForApi(range.end),
    });

    const url = `${this.baseUrl}/calendars/${
      encodeURIComponent(this.calendarId)
    }/events?${params}`;

    const data = await this.request(url, "fetch calendar events", {
      method: "GET",
    });
    return parseGoogleEvents(data).map(toStoredEvent);
  }

  /**
   * Create a new event on the calendar (POST .../events)
   */
  async createEvent(draft: EventDraft): Promise<StoredEvent> {
    const data = await this.request(this.eventsUrl(), "create calendar event", {
      method: "POST",
      body: JSON.stringify(toGoogleDraft(draft)),
    });
    return this.parseSingleEvent(data, "create calendar event");
  }

  /**
   * Update an existing event (PATCH .../events/{eventId})
   */
  async updateEvent(eventId: string, draft: EventDraft): Promise<StoredEvent> {
    const url = `${this.eventsUrl()}/${encodeURIComponent(eventId)}`;
    const data = await this.request(url, "update calendar event", {
      method: "PATCH",
      body: JSON.stringify(toGoogleDraft(draft)),
    });
    return this.parseSingleEvent(data, "update calendar event");
  }

  /**
   * Delete an event (DELETE .../events/{eventId})
   */
  async deleteEvent(eventId: string): Promise<void> {
    const url = `${this.eventsUrl()}/${encodeURIComponent(eventId)}`;
    await this.request(url, "delete calendar event", { method: "DELETE" });
  }

  /**
   * The URL of the events collection of the calendar
   */
  private eventsUrl(): string {
    return `${this.baseUrl}/calendars/${
      encodeURIComponent(this.calendarId)
    }/events`;
  }

  /**
   * The current OAuth access token, from the authentication service
   *
   * @throws CalendarApiError when there is no valid session
   */
  private accessToken(): string {
    const tokens = this.authentication.getTokens();
    if (!tokens) {
      throw new CalendarApiError(
        "No authenticated session: log in to use the calendar",
        401,
      );
    }
    return tokens.accessToken;
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
          Authorization: `Bearer ${this.accessToken()}`,
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
  private parseSingleEvent(data: unknown, action: string): StoredEvent {
    const event = parseGoogleEvent(data);
    if (!event) {
      throw new CalendarApiError(
        `Failed to ${action}: the calendar returned no event`,
      );
    }
    return toStoredEvent(event);
  }
}
