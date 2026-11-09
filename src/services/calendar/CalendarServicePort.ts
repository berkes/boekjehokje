/**
 * Calendar service port (input port of the calendar service)
 *
 * The port defines what the application (hooks and components) may ask
 * the calendar service: the domain model (rooms with their bookings,
 * editability decided by the permission service) and the operations on
 * it. CalendarService implements this port; the rest of the application
 * only depends on this module, never on a repository adapter.
 */

import { endOfDay, startOfDay } from "../clock/index.ts";

/**
 * A booking represents a room reservation. Editability is decided by
 * the calendar service (adapter) for the user it serves (ADR-0004).
 */
export interface Booking {
  id: string;
  uid: string;
  summary: string;
  /**
   * Link to the booking's event in the calendar source's web UI, null
   * when the source does not provide one (then the day view of the
   * start date is the fallback)
   */
  htmlLink: string | null;
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
 * A day range for querying bookings: local midnight to local midnight
 */
export interface DayRange {
  start: Date;
  end: Date;
}

/**
 * The port every calendar source must implement
 */
export interface CalendarServicePort {
  /**
   * Get all rooms with their bookings for a specific day
   *
   * A day's bookings are all bookings overlapping the day: a booking
   * that starts on the previous day but ends on the requested day is
   * included.
   *
   * @param day - The day to query (default: today)
   * @returns Promise resolving to array of rooms with their bookings
   */
  getDay(day?: Date): Promise<Room[]>;

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
 * Get the range of the given day (local midnight to local midnight)
 */
export function getDayRange(day: Date): DayRange {
  return { start: startOfDay(day), end: endOfDay(day) };
}
