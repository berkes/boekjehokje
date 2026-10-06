/**
 * Calendar Service
 *
 * Domain language API for fetching room bookings from the NYMA calendar.
 * Uses the CalendarApiClient interface (dependency injection) for API operations.
 *
 * Public API uses domain concepts (rooms, bookings, bookers, weeks)
 * and does not expose implementation details like "group by room".
 */

import type { CalendarApiClient } from "../utils/calendar/CalendarApiClient.ts";
import { CALENDAR_ID } from "../utils/calendar/GoogleCalendarApiClient.ts";
import { CalendarApiError } from "../utils/googleCalendarApi.ts";
import {
  parseAndGroupEvents,
  type ParsedEvent,
  type RoomName,
} from "../utils/rooms/index.ts";
import type { CalendarEvent } from "../utils/types.ts";

// Re-export CalendarApiError for use by other modules
export { CalendarApiError };

/**
 * Room events internal type from parser
 */
type RoomEventsInternal = {
  room: RoomName;
  events: ParsedEvent[];
};

/**
 * A week range for querying events
 */
export interface WeekRange {
  start: Date;
  end: Date;
}

/**
 * A booking represents a room reservation
 */
export interface Booking {
  id: string;
  uid: string;
  summary: string;
  room: RoomName;
  booker: string | null;
  start: Date;
  end: Date;
}

/**
 * Room bookings - a room with all its bookings
 * This is the primary data structure returned by the service
 */
export interface RoomBookings {
  room: RoomName;
  bookings: Booking[];
}

/**
 * Get the current week range (Monday to Sunday)
 */
export function getThisWeek(): WeekRange {
  const now = new Date();

  // Get start of week (Monday)
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  start.setHours(0, 0, 0, 0);

  // Get end of week (Sunday)
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Get the next week range (Monday to Sunday)
 */
export function getNextWeek(): WeekRange {
  const thisWeek = getThisWeek();
  const start = new Date(thisWeek.end);
  start.setDate(start.getDate() + 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Convert ParsedEvent to Booking (domain type)
 */
function parsedEventToBooking(event: ParsedEvent): Booking {
  return {
    id: event.id,
    uid: event.uid,
    summary: event.summary,
    room: event.room,
    booker: event.booker,
    start: event.start,
    end: event.end,
  };
}

/**
 * Convert RoomEventsInternal to RoomBookings
 */
function roomEventsToRoomBookings(
  roomEvents: RoomEventsInternal[],
): RoomBookings[] {
  return roomEvents.map(({ room, events }) => ({
    room,
    bookings: events.map(parsedEventToBooking),
  }));
}

/**
 * Calendar Service
 *
 * Provides domain language API for fetching room bookings.
 * Uses dependency injection for CalendarApiClient to enable testing.
 * TODO: Make the Parser dependeny injected as well so we can test the public
 * api and its output without re-testing the parser entirely
 */
export class CalendarService {
  private apiClient: CalendarApiClient;
  private calendarId: string;

  /**
   * Create a new Calendar Service
   *
   * @param apiClient - The calendar API client to use (injected dependency)
   * @param config - Optional configuration
   */
  constructor(apiClient: CalendarApiClient, calendarId: string) {
    this.apiClient = apiClient;
    this.calendarId = calendarId;
  }

  /**
   * Get all bookings for a specific week
   *
   * @param week - The week range to query (default: current week)
   * @returns Promise resolving to array of RoomBookings
   * @throws CalendarApiError on API errors
   */
  async getBookings(week: WeekRange = getThisWeek()): Promise<RoomBookings[]> {
    const events = await this.apiClient.fetchEvents(
      this.calendarId,
      week.start,
      week.end,
    );

    const roomEvents = parseAndGroupEvents(events as CalendarEvent[]);
    return roomEventsToRoomBookings(roomEvents);
  }
}

/**
 * Create a CalendarService with a Google Calendar API client
 *
 * Convenience factory function for creating a service with the real API client.
 *
 * @param accessToken - OAuth 2.0 access token
 * @param config - Optional configuration
 * @returns A new CalendarService instance
 */
export async function createCalendarService(
  accessToken: string,
): Promise<CalendarService> {
  // Import here to avoid circular dependencies
  const { GoogleCalendarApiClient } = await import(
    "../utils/calendar/GoogleCalendarApiClient.ts"
  );
  const apiClient = new GoogleCalendarApiClient(accessToken);
  return new CalendarService(apiClient, CALENDAR_ID);
}
