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
  type Booking,
  type WeekRange,
  type Room,
  ROOMS,
} from "./CalendarService.ts";
