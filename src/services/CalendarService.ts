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
  type Booking,
  createRooms,
  parseAndGroupEvents,
  populateRoomsWithBookings,
  type Room,
  ROOMS,
  UNKNOWN_ROOM,
  UNKNOWN_ROOM_INSTANCE,
} from "./parser.ts";
import type { CalendarEvent } from "../utils/types.ts";

// Re-export CalendarApiError for use by other modules
export { CalendarApiError };

/**
 * A week range for querying events
 */
export interface WeekRange {
  start: Date;
  end: Date;
}

// Re-export Booking type for backward compatibility
export type { Booking };

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
 * Calendar Service
 *
 * Provides domain language API for fetching room bookings.
 * Uses dependency injection for CalendarApiClient to enable testing.
 * Returns Room instances populated with their bookings.
 */
export class CalendarService {
  private apiClient: CalendarApiClient;
  private calendarId: string;

  /**
   * Create a new Calendar Service
   *
   * @param apiClient - The calendar API client to use (injected dependency)
   * @param calendarId - The calendar ID to fetch events from
   */
  constructor(apiClient: CalendarApiClient, calendarId: string) {
    this.apiClient = apiClient;
    this.calendarId = calendarId;
  }

  /**
   * Get all rooms with their bookings for a specific week
   *
   * @param week - The week range to query (default: current week)
   * @returns Promise resolving to array of Room instances with their bookings
   * @throws CalendarApiError on API errors
   */
  async getRoomsWithBookings(week: WeekRange = getThisWeek()): Promise<Room[]> {
    const events = await this.apiClient.fetchEvents(
      this.calendarId,
      week.start,
      week.end,
    );

    const roomWithBookings = parseAndGroupEvents(events as CalendarEvent[]);
    return populateRoomsWithBookings(roomWithBookings);
  }

  /**
   * Get all bookings for a specific week (legacy method for backward compatibility)
   *
   * @param week - The week range to query (default: current week)
   * @returns Promise resolving to array of RoomBookings (legacy format)
   * @throws CalendarApiError on API errors
   */
  async getBookings(
    week: WeekRange = getThisWeek(),
  ): Promise<{ room: string; bookings: Booking[] }[]> {
    const rooms = await this.getRoomsWithBookings(week);

    return rooms.map((room) => ({
      room: room.canonicalName,
      bookings: room.bookings,
    }));
  }
}

/**
 * Create a CalendarService with a Google Calendar API client
 *
 * Convenience factory function for creating a service with the real API client.
 *
 * @param accessToken - OAuth 2.0 access token
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

// Export Room type and helper functions
export type { Room };
export { createRooms, ROOMS, UNKNOWN_ROOM, UNKNOWN_ROOM_INSTANCE };
