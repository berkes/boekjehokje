/**
 * Calendar service port
 *
 * The port defines what the application needs from a calendar source:
 * the domain model (rooms with their bookings, editability decided by
 * the service) and the operations on it. Concrete adapters implement
 * this port (ports and adapters): GoogleCalendarAdapter fetches real
 * data, DemoCalendarAdapter produces demo data. The rest of the
 * application only depends on this module, never on an adapter.
 */

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
