/**
 * Services - public API
 *
 * Exports only the domain language API for calendar operations.
 * Implementation details are not exposed.
 */

export {
  CalendarApiError,
  CalendarService,
  createCalendarService,
  getNextWeek,
  getThisWeek,
} from "./CalendarService.ts";

export type { Booking, RoomBookings, WeekRange } from "./CalendarService.ts";
