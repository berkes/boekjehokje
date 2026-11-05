/**
 * Calendar service port
 *
 * The port defines what the application needs from a calendar source:
 * the domain model (rooms with their bookings, editability decided by
 * the service) and the operations on it. Concrete adapters implement
 * this port (ports and adapters): GoogleCalendarAdapter fetches real
 * data, DemoCalendarAdapter produces demo data. The rest of the
 * application only depends on this module, never on an adapter.
 *
 * The module also owns the write side of the standardized calendar event
 * format (bookingToEvent), the inverse of the parser's parseEvent.
 */

import { ROOMS } from "./rooms.ts";
import type { CalendarEventDraft } from "../utils/types.ts";

/**
 * A booking represents a room reservation. Editability is decided by
 * the calendar service (adapter) for the user it serves (ADR-0004).
 */
export interface Booking {
  id: string;
  uid: string;
  summary: string;
  room: string;
  booker: string | null;
  /**
   * Whether the user the calendar is served for may edit this booking
   */
  editable: boolean;
  details: {
    originalName: string;
    author: string;
  };
  start: Date;
  end: Date;
}

/**
 * A room with its bookings, as served by a calendar service
 */
export interface Room {
  canonicalName: string;
  shortName: string;
  bookings: Booking[];
}

/**
 * The fields of a booking that the serializer needs: the room (canonical
 * name), the booker, the optional contact, and the time range. NewBooking
 * and BookingUpdate both carry them.
 */
export interface BookingEventSource {
  /** Canonical room name */
  room: string;
  /** Booker's name */
  booker: string;
  /** Booker's contact details */
  contact?: string;
  start: Date;
  end: Date;
}

/**
 * A new booking in domain language: the event as the service knows it.
 * Persisting it to the calendar source is the service's job.
 */
export interface NewBooking extends BookingEventSource {
  /** Booker's contact details */
  contact: string;
}

/**
 * An existing booking with new values, in domain language: everything
 * needed to update a booking on the calendar source, identified by its id
 */
export interface BookingUpdate extends NewBooking {
  /** Id of the booking event on the calendar source */
  id: string;
}

/**
 * Serialize a booking into the standardized calendar event format: the
 * inverse of the parser's parseEvent. The summary is "room short name |
 * booker" (the same format the booking form previews), so parsing the
 * written event yields the same room and booker; the contact goes into
 * the description.
 */
export function bookingToEvent(
  booking: BookingEventSource,
): CalendarEventDraft {
  const room = ROOMS.find((r) => r.canonicalName === booking.room);
  const shortName = room?.shortName ?? booking.room;
  const summary = `${shortName} | ${booking.booker}`;

  const event: CalendarEventDraft = {
    summary,
    start: { dateTime: booking.start.toISOString() },
    end: { dateTime: booking.end.toISOString() },
  };

  const contact = booking.contact?.trim();
  if (contact) {
    event.description = contact;
  }

  return event;
}

/**
 * A week range for querying bookings
 */
export interface WeekRange {
  start: Date;
  end: Date;
}

/**
 * The port every calendar source must implement
 */
export interface CalendarServicePort {
  /**
   * Get all rooms with their bookings for a specific week
   *
   * @param week - The week range to query (default: current week)
   * @returns Promise resolving to array of rooms with their bookings
   */
  getRoomsWithBookings(week?: WeekRange): Promise<Room[]>;

  /**
   * Create a new booking on the calendar source
   *
   * @param booking - The booking in domain language
   * @returns Promise resolving to the created booking, as the calendar
   *          source stored it (parsed back into domain language)
   */
  createBooking(booking: NewBooking): Promise<Booking>;

  /**
   * Update an existing booking on the calendar source
   *
   * @param booking - The booking with its new values, identified by id
   * @returns Promise resolving to the updated booking, as the calendar
   *          source stored it (parsed back into domain language)
   */
  updateBooking(booking: BookingUpdate): Promise<Booking>;

  /**
   * Delete a booking from the calendar source
   *
   * @param bookingId - The id of the booking to delete
   */
  deleteBooking(bookingId: string): Promise<void>;
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
