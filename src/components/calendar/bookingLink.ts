/**
 * Link from a booking to its event in the Google Calendar web UI
 *
 * The calendar API provides an htmlLink per event, kept on the domain
 * Booking (issue #45). When the source has none, the fallback is the
 * day view of the booking's start date.
 */
import type { Booking } from "../../services/index.ts";

/**
 * Base of the Google Calendar day view URLs
 */
const GOOGLE_CALENDAR_DAY_VIEW =
  "https://calendar.google.com/calendar/u/0/r/day";

/**
 * The URL that opens the booking in the Google Calendar web UI: the
 * event's own link when the calendar API provided one, otherwise the
 * day view of the booking's start date, e.g.
 * https://calendar.google.com/calendar/u/0/r/day/2026/11/12
 */
export function bookingCalendarLink(booking: Booking): string {
  if (booking.htmlLink) {
    return booking.htmlLink;
  }
  const year = booking.start.getFullYear();
  const month = booking.start.getMonth() + 1;
  const day = booking.start.getDate();
  return `${GOOGLE_CALENDAR_DAY_VIEW}/${year}/${month}/${day}`;
}
