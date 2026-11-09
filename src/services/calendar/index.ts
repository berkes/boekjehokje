/**
 * Calendar service - public API
 *
 * The calendar is served through the CalendarServicePort; CalendarService
 * implements it on top of a CalendarEventRepositoryPort (Google Calendar or
 * demo data), the event format service, the rooms service, the permission
 * service and the clock. The domain types (Room, Booking), the day-range
 * helper and the repository error are part of the public API. Everything
 * else in this module stays private to it.
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
export {
  CalendarApiError,
  type CalendarEventRepositoryPort,
  type EventDraft,
  type StoredEvent,
} from "./CalendarEventRepositoryPort.ts";
export {
  CALENDAR_ID,
  GoogleCalendarRepositoryAdapter,
  type GoogleCalendarRepositoryAdapterDeps,
} from "./GoogleCalendarRepositoryAdapter.ts";
export { DemoCalendarRepositoryAdapter } from "./DemoCalendarRepositoryAdapter.ts";
export {
  CalendarService,
  type CalendarServiceDeps,
} from "./CalendarService.ts";
