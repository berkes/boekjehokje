/**
 * Services - public API
 *
 * The calendar is served through the CalendarServicePort; the two
 * adapters (Google Calendar and demo) implement it. The domain types
 * (Room, Booking), the day-range helper and the overlap detection
 * (issue #16) are part of the public API.
 * Everything else in this module stays private to it.
 *
 * Authentication is its own module with its own public API:
 * ./authentication/index.ts.
 */

export type {
  Booking,
  BookingUpdate,
  CalendarServicePort,
  DayRange,
  NewBooking,
  Room,
} from "./CalendarServicePort.ts";
export { getDayRange } from "./CalendarServicePort.ts";
export { findOverlaps, rangesOverlap } from "./overlaps.ts";
export { DemoCalendarAdapter } from "./DemoCalendarAdapter.ts";
export { GoogleCalendarAdapter } from "./GoogleCalendarAdapter.ts";
export { UNKNOWN_ROOM, UNKNOWN_ROOM_DESCRIPTION } from "./rooms.ts";
export { CalendarApiError } from "../utils/googleCalendarApi.ts";
