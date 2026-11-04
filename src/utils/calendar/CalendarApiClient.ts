/**
 * Calendar API Client Interface
 *
 * Interface for calendar API operations.
 * This enables dependency injection for testing.
 */

import type { CalendarEvent, CalendarEventDraft } from "../types.ts";

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
   * Create a new event on a calendar
   *
   * @param calendarId - The calendar ID to create the event on
   * @param event - The event to create (summary, time range, description)
   * @returns Promise resolving to the created event, as the calendar stores it
   */
  createEvent(
    calendarId: string,
    event: CalendarEventDraft,
  ): Promise<CalendarEvent>;

  /**
   * Update an existing event on a calendar
   *
   * @param calendarId - The calendar ID the event lives on
   * @param eventId - The ID of the event to update
   * @param changes - The fields to replace on the event
   * @returns Promise resolving to the updated event, as the calendar stores it
   */
  updateEvent(
    calendarId: string,
    eventId: string,
    changes: CalendarEventDraft,
  ): Promise<CalendarEvent>;

  /**
   * Delete an event from a calendar
   *
   * @param calendarId - The calendar ID the event lives on
   * @param eventId - The ID of the event to delete
   * @returns Promise resolving when the event is gone
   */
  deleteEvent(calendarId: string, eventId: string): Promise<void>;

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
