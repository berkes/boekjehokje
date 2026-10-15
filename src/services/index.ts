/**
 * Services - public API
 *
 * Exports only the domain language API for calendar operations.
 * Implementation details are not exposed.
 */

export {
  type Booking,
  CalendarApiError,
  CalendarService,
  createCalendarService,
  getNextWeek,
  getThisWeek,
  type Room,
  ROOMS,
  UNKNOWN_ROOM,
  UNKNOWN_ROOM_DESCRIPTION,
  type WeekRange,
} from "./CalendarService.ts";
