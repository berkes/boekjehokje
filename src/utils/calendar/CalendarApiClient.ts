/**
 * Calendar API Client Interface
 *
 * Interface for calendar API operations.
 * This enables dependency injection for testing.
 */

import type { CalendarEvent } from "../types.ts";

/**
 * Interface for calendar API operations
 * Implementations can be real (GoogleCalendarApiClient) or mock (for tests)
 */
export interface CalendarApiClient {
  /**
   * Fetch events from a calendar
   *
   * @param calendarId - The calendar ID to fetch from
   * @param timeMin - Start of time range (inclusive)
   * @param timeMax - End of time range (exclusive)
   * @param maxResults - Maximum number of events to return
   * @returns Promise resolving to array of calendar events
   */
  fetchEvents(
    calendarId: string,
    timeMin?: Date,
    timeMax?: Date,
    maxResults?: number,
  ): Promise<CalendarEvent[]>;

  /**
   * List all calendars available to the user
   *
   * @returns Promise resolving to array of calendar list entries
   */
  listCalendars(): Promise<CalendarListEntry[]>;
}

/**
 * Calendar list entry
 */
export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
}
