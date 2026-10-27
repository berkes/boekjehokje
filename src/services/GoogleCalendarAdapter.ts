/**
 * Google Calendar adapter
 *
 * The adapter that fulfils the CalendarServicePort with real data: it
 * fetches events from the NYMA calendar through a CalendarApiClient,
 * has them parsed into room groups, and builds the domain rooms from
 * those. Editability (ADR-0004) is decided here, by creator email vs.
 * the profile email of the user this calendar is served for.
 */

import type { AuthenticatedUser } from "./authentication/AuthenticationServicePort.ts";
import type { CalendarApiClient } from "../utils/calendar/CalendarApiClient.ts";
import { CalendarApiError } from "../utils/googleCalendarApi.ts";
import type { CalendarEvent } from "../utils/types.ts";

import {
  type CalendarServicePort,
  getThisWeek,
  type Room,
  type WeekRange,
} from "./CalendarServicePort.ts";
import {
  parseAndGroupEvents,
  type ParsedBooking,
  type RoomGroup,
} from "./parser.ts";

// Re-export CalendarApiError for use by other modules
export { CalendarApiError };

/**
 * Google Calendar adapter
 *
 * Provides the room bookings from the real NYMA calendar for the given
 * user profile. Uses dependency injection for the CalendarApiClient to
 * enable testing.
 */
export class GoogleCalendarAdapter implements CalendarServicePort {
  private apiClient: CalendarApiClient;
  private calendarId: string;
  private profile: AuthenticatedUser | null;

  /**
   * Create a new Google Calendar adapter
   *
   * @param apiClient - The calendar API client to use (injected dependency)
   * @param calendarId - The calendar ID to fetch events from
   * @param profile - The user the calendar is served for; their bookings
   *                  become editable, all others stay read-only
   */
  constructor(
    apiClient: CalendarApiClient,
    calendarId: string,
    profile: AuthenticatedUser | null,
  ) {
    this.apiClient = apiClient;
    this.calendarId = calendarId;
    this.profile = profile;
  }

  /**
   * Get all rooms with their bookings for a specific week
   *
   * @param week - The week range to query (default: current week)
   * @returns Promise resolving to array of rooms with their bookings
   * @throws CalendarApiError on API errors
   */
  async getRoomsWithBookings(week: WeekRange = getThisWeek()): Promise<Room[]> {
    const events = await this.apiClient.fetchEvents(
      this.calendarId,
      week.start,
      week.end,
    );

    const groups = parseAndGroupEvents(events as CalendarEvent[]);
    return this.buildRooms(groups);
  }

  /**
   * Build the domain rooms from the parsed room groups. One step in
   * building the list is deciding editability: this is the only place
   * where that rule lives, regardless of what the API client or parser
   * produced.
   */
  private buildRooms(groups: RoomGroup[]): Room[] {
    return groups.map(({ room, bookings }) => ({
      canonicalName: room.canonicalName,
      shortName: room.shortName,
      bookings: bookings.map((booking) => ({
        ...booking,
        editable: this.can("edit", booking),
      })),
    }));
  }

  /**
   * Whether the user this calendar is served for may perform the given
   * action on the given booking. Emails compare case-insensitively,
   * since email addresses are case-insensitive for the domain part and
   * Google treats them as case-insensitive identifiers.
   */
  private can(action: "edit", booking: ParsedBooking): boolean {
    if (!this.profile?.email) return false;
    if (action !== "edit") return false;
    return booking.details.author.trim().toLowerCase() ===
      this.profile.email.trim().toLowerCase();
  }
}
