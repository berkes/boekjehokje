/**
 * Calendar service - public API
 *
 * The calendar is served through the CalendarServicePort; CalendarService
 * implements it on top of a CalendarEventRepositoryPort (Google Calendar or
 * demo data). The domain types (Room, Booking), the day-range helper, the
 * overlap detection (issue #16), the standardized event format and the
 * room configuration are part of the public API. Everything else in this
 * module stays private to it.
 */

export type {
  Booking,
  BookingEventSource,
  BookingUpdate,
  CalendarServicePort,
  DayRange,
  NewBooking,
  Room,
} from "./CalendarServicePort.ts";
export { getDayRange } from "./CalendarServicePort.ts";
export type {
  CalendarEventRepositoryPort,
  EventDraft,
  StoredEvent,
} from "./CalendarEventRepositoryPort.ts";
export {
  CALENDAR_ID,
  GoogleCalendarRepositoryAdapter,
  type GoogleCalendarRepositoryAdapterDeps,
} from "./GoogleCalendarRepositoryAdapter.ts";
export { DemoCalendarRepositoryAdapter } from "./DemoCalendarRepositoryAdapter.ts";
export { bookingToEvent } from "./eventFormat.ts";
export { type ParsedEvent, parseEvent } from "./parser.ts";
export {
  findOverlaps,
  rangesOverlap,
  type RoomWithBookings,
} from "./overlaps.ts";
export {
  RoomConfig,
  ROOMS,
  UNKNOWN_ROOM,
  UNKNOWN_ROOM_DESCRIPTION,
} from "./rooms.ts";
export { CalendarApiError } from "./CalendarApiError.ts";
export {
  CalendarService,
  type CalendarServiceDeps,
} from "./CalendarService.ts";
