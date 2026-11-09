/**
 * Calendar service
 *
 * The calendar service is the app's domain object for rooms and bookings.
 * It implements the CalendarServicePort (input port) and holds no React
 * state: everything it keeps is ephemeral (injected dependencies only),
 * and every result is returned to the caller — the hooks manage it as
 * React state.
 *
 * All dependencies are passed in on creation: the calendar event
 * repository (output port; Google Calendar or demo data), the permission
 * service (decides editability, ADR-0004) and the clock (defaults "today"
 * to now). Services interact: getDay marks each booking editable by
 * asking the permission service.
 */

import type { ClockPort } from "../clock/ClockPort.ts";
import type {
  EventFormatPort,
  ParsedEvent,
} from "../eventformat/EventFormatPort.ts";
import type { PermissionServicePort } from "../permissions/PermissionServicePort.ts";
import type { RoomsPort } from "../rooms/RoomsPort.ts";
import {
  type Booking,
  type BookingUpdate,
  type CalendarServicePort,
  type DayRange,
  getDayRange,
  type NewBooking,
  type Room,
} from "./CalendarServicePort.ts";
import {
  type CalendarEventRepositoryPort,
  type StoredEvent,
} from "./CalendarEventRepositoryPort.ts";

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
 * The dependencies of the calendar service, passed in on creation
 */
export interface CalendarServiceDeps {
  /** The calendar event repository (output port) to read/write events on */
  events: CalendarEventRepositoryPort;
  /** The permission service, deciding editability (ADR-0004) */
  permissions: PermissionServicePort;
  /** The clock, defaulting "today" to the current instant */
  clock: ClockPort;
  /** The event format service, parsing and serializing events */
  eventFormat: EventFormatPort;
  /** The rooms service, providing the room catalog */
  rooms: RoomsPort;
}

/**
 * Calendar service
 *
 * Reads events from the calendar event repository, parses and groups them
 * into the domain rooms and marks each booking editable through the
 * permission service; writes go back through the same repository,
 * serialized into the standardized event format.
 */
export class CalendarService implements CalendarServicePort {
  private events: CalendarEventRepositoryPort;
  private permissions: PermissionServicePort;
  private clock: ClockPort;
  private eventFormat: EventFormatPort;
  private rooms: RoomsPort;

  /**
   * Create a new calendar service
   *
   * @param deps - The injected dependencies: event repository, permission
   *               service and clock
   */
  constructor(deps: CalendarServiceDeps) {
    this.events = deps.events;
    this.permissions = deps.permissions;
    this.clock = deps.clock;
    this.eventFormat = deps.eventFormat;
    this.rooms = deps.rooms;
  }

  /**
   * Get all rooms with their bookings for a specific day
   *
   * The fetch window is the day itself (local midnight to local
   * midnight). The repository returns every event overlapping that
   * window — an event counts when its end is after the range start and
   * its start before the range end — so bookings that start the previous
   * day and end on the requested day come along; the overlap filter in
   * buildRooms keeps exactly those, whatever the source returns.
   *
   * @param day - The day to query (default: today, per the clock)
   * @returns Promise resolving to array of rooms with their bookings
   */
  async getDay(day: Date = this.clock.now()): Promise<Room[]> {
    const range = getDayRange(day);
    const events = await this.events.fetchEvents(range);
    return this.buildRooms(events, range);
  }

  /**
   * Create a new booking: serialize it into the standardized event format
   * and store it through the event repository. The stored event is parsed
   * back into domain language, so callers get the booking as the calendar
   * source stored it.
   */
  async createBooking(booking: NewBooking): Promise<Booking> {
    const stored = await this.events.createEvent(
      this.eventFormat.serialize(booking),
    );
    return this.toBooking(this.eventFormat.parse(stored));
  }

  /**
   * Update an existing booking: serialize the new values and store them
   * onto the event through the event repository
   */
  async updateBooking(booking: BookingUpdate): Promise<Booking> {
    const { id, ...fields } = booking;
    const stored = await this.events.updateEvent(
      id,
      this.eventFormat.serialize(fields),
    );
    return this.toBooking(this.eventFormat.parse(stored));
  }

  /**
   * Delete a booking: remove the event through the event repository
   */
  async deleteBooking(bookingId: string): Promise<void> {
    await this.events.deleteEvent(bookingId);
  }

  /**
   * Build the domain rooms from the fetched events: ignored events are
   * skipped, the rest are parsed, kept when they overlap the queried day
   * (which includes bookings that start the previous day and end on the
   * day) and grouped under their room. Every room is returned, also
   * without bookings, so the day board shows all columns with their free
   * slots. One step in building the list is deciding editability: the
   * permission service is asked, so this is the only place the flag is
   * set, regardless of what the repository produced.
   */
  private buildRooms(events: StoredEvent[], range: DayRange): Room[] {
    const eventsByRoom = new Map<string, ParsedEvent[]>();
    for (const room of this.rooms.all()) {
      eventsByRoom.set(room.canonicalName, []);
    }
    for (const event of events) {
      if (isIgnoredEvent(event.summary)) continue;
      const parsed = this.eventFormat.parse(event);
      if (parsed.start >= range.end || parsed.end <= range.start) continue;
      eventsByRoom.get(parsed.room)?.push(parsed);
    }

    const rooms: Room[] = [];
    for (const [canonicalName, parsedEvents] of eventsByRoom) {
      const room = this.rooms.all().find((r) =>
        r.canonicalName === canonicalName
      );
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
   * A parsed event as a domain booking, with editability decided by the
   * permission service (ADR-0004)
   */
  private toBooking(parsed: ParsedEvent): Booking {
    const booking: Booking = {
      id: parsed.id,
      uid: parsed.uid,
      summary: parsed.summary,
      htmlLink: parsed.htmlLink,
      room: parsed.room,
      booker: parsed.booker,
      editable: false,
      details: {
        originalName: parsed.summary,
        author: parsed.creatorEmail,
      },
      start: parsed.start,
      end: parsed.end,
    };
    booking.editable = this.permissions.may("update", booking);
    return booking;
  }
}
