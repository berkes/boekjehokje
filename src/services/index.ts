/**
 * Services - public API
 *
 * The calendar is served through the CalendarServicePort; the two
 * adapters (Google Calendar and demo) implement it. The domain types
 * (Room, Booking) and the week helpers are part of the port. Everything
 * else in this module stays private to it.
 *
 * Authentication is its own module with its own public API:
 * ./authentication/index.ts.
 */

export type {
  Booking,
  CalendarServicePort,
  Room,
  WeekRange,
} from "./CalendarServicePort.ts";
export { getNextWeek, getThisWeek } from "./CalendarServicePort.ts";
export { DemoCalendarAdapter } from "./DemoCalendarAdapter.ts";
export { GoogleCalendarAdapter } from "./GoogleCalendarAdapter.ts";
export { UNKNOWN_ROOM, UNKNOWN_ROOM_DESCRIPTION } from "./rooms.ts";
export { CalendarApiError } from "../utils/googleCalendarApi.ts";
