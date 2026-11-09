/**
 * Google Calendar adapter
 *
 * The adapter that fulfils the CalendarServicePort with real data: it
 * fetches events from the NYMA calendar through a CalendarApiClient,
 * parses them with the parser and groups them into the domain rooms;
 * bookings are written back through the same client, serialized into
 * the standardized event format. Editability (ADR-0004) is decided
 * here, by creator email vs. the profile email of the user this
 * calendar is served for.
 */

import type { AuthenticatedUser } from "./authentication/AuthenticationServicePort.ts";
import type { CalendarApiClient } from "../utils/calendar/CalendarApiClient.ts";
import { CalendarApiError } from "../utils/googleCalendarApi.ts";
import type { CalendarEvent } from "../utils/types.ts";

import {
  type Booking,
  bookingToEvent,
  type BookingUpdate,
  type CalendarServicePort,
  type DayRange,
  getDayRange,
  type NewBooking,
  type Room,
} from "./CalendarServicePort.ts";
import { type ParsedEvent, parseEvent } from "./parser.ts";
import { ROOMS } from "./rooms.ts";

// Re-export CalendarApiError for use by other modules
export { CalendarApiError };

/**
 * Names of calendar events that must be ignored entirely, for example
 * placeholder bookings the source calendar uses to block a room from being
 * booked. Matched against the event summary (trimmed, exact).
 */
const IGNORED_EVENT_SUMMARIES = [
  "C3 workshopruimte Team NYMA makersplaats",
  "Inloopuurtje huurders",
] as const;

/**
 * Substrings that hide an event entirely, regardless of the rest of the
 * summary (e.g. anything with "bakwagen" in the name). Matched against the
 * event summary (trimmed, case-insensitive).
 */
const IGNORED_EVENT_SUMMARY_SUBSTRINGS = [
  "bakwagen",
  "workshopruimte",
  "torenkamer",
] as const;

/**
 * Check if an event summary is on the ignore list
 */
function isIgnoredEvent(summary: string): boolean {
  const trimmed = summary.trim();

  if (IGNORED_EVENT_SUMMARIES.some((name) => name === trimmed)) {
    return true;
  }

  const lowered = trimmed.toLowerCase();
  return IGNORED_EVENT_SUMMARY_SUBSTRINGS.some((fragment) =>
    lowered.includes(fragment)
  );
}

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
   * Get all rooms with their bookings for a specific day
   *
   * The fetch window is the day itself (local midnight to local
   * midnight). Google returns every event overlapping that window — an
   * event counts when its end is after timeMin and its start before
   * timeMax — so bookings that start the previous day and end on the
   * requested day come along; the overlap filter in buildRooms keeps
   * exactly those, whatever the source returns.
   *
   * @param day - The day to query (default: today)
   * @returns Promise resolving to array of rooms with their bookings
   * @throws CalendarApiError on API errors
   */
  async getDay(day: Date = new Date()): Promise<Room[]> {
    const range = getDayRange(day);
    const events = await this.apiClient.fetchEvents(
      this.calendarId,
      range.start,
      range.end,
    );

    return this.buildRooms(events as CalendarEvent[], range);
  }

  /**
   * Create a new booking: serialize it into the standardized event format
   * and POST it to the NYMA calendar. The created event is parsed back
   * into domain language, so callers get the booking as the calendar
   * stored it.
   */
  async createBooking(booking: NewBooking): Promise<Booking> {
    const event = await this.apiClient.createEvent(
      this.calendarId,
      bookingToEvent(booking),
    );
    return this.toDomainBooking(event);
  }

  /**
   * Update an existing booking: serialize the new values and PATCH them
   * onto the event on the NYMA calendar
   */
  async updateBooking(booking: BookingUpdate): Promise<Booking> {
    const { id, ...fields } = booking;
    const event = await this.apiClient.updateEvent(
      this.calendarId,
      id,
      bookingToEvent(fields),
    );
    return this.toDomainBooking(event);
  }

  /**
   * Delete a booking: DELETE the event from the NYMA calendar
   */
  async deleteBooking(bookingId: string): Promise<void> {
    await this.apiClient.deleteEvent(this.calendarId, bookingId);
  }

  /**
   * Build the domain rooms from the fetched events: ignored events are
   * skipped, the rest are parsed, kept when they overlap the queried day
   * (which includes bookings that start the previous day and end on the
   * day) and grouped under their room. Every room is returned, also
   * without bookings, so the day board shows all columns with their free
   * slots. One step in building the list is deciding editability: this
   * is the only place where that rule lives, regardless of what the API
   * client or parser produced.
   */
  private buildRooms(events: CalendarEvent[], range: DayRange): Room[] {
    const eventsByRoom = new Map<string, ParsedEvent[]>();
    for (const room of ROOMS) {
      eventsByRoom.set(room.canonicalName, []);
    }
    for (const event of events) {
      if (isIgnoredEvent(event.summary)) continue;
      const parsed = parseEvent(event);
      if (parsed.start >= range.end || parsed.end <= range.start) continue;
      eventsByRoom.get(parsed.room)?.push(parsed);
    }

    const rooms: Room[] = [];
    for (const [canonicalName, parsedEvents] of eventsByRoom) {
      const room = ROOMS.find((r) => r.canonicalName === canonicalName);
      rooms.push({
        canonicalName,
        shortName: room?.shortName ?? canonicalName,
        bookings: parsedEvents.map((parsed) => this.toBooking(parsed)),
      });
    }
    rooms.sort((a, b) => a.canonicalName.localeCompare(b.canonicalName));
    return rooms;
  }

  /**
   * Parse one event from the calendar back into a domain booking,
   * deciding editability the same way as for fetched bookings
   */
  private toDomainBooking(event: CalendarEvent): Booking {
    return this.toBooking(parseEvent(event));
  }

  /**
   * A parsed event as a domain booking, with editability decided here
   */
  private toBooking(parsed: ParsedEvent): Booking {
    return {
      id: parsed.id,
      uid: parsed.uid,
      summary: parsed.summary,
      htmlLink: parsed.htmlLink,
      room: parsed.room,
      booker: parsed.booker,
      editable: this.canEdit(parsed.creatorEmail),
      details: {
        originalName: parsed.summary,
        author: parsed.creatorEmail,
      },
      start: parsed.start,
      end: parsed.end,
    };
  }

  /**
   * Whether the user this calendar is served for may edit a booking by
   * the given author. Emails compare case-insensitively, since email
   * addresses are case-insensitive for the domain part and Google
   * treats them as case-insensitive identifiers.
   */
  private canEdit(author: string): boolean {
    if (!this.profile?.email) return false;
    return author.trim().toLowerCase() ===
      this.profile.email.trim().toLowerCase();
  }
}
