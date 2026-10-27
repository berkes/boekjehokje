/**
 * Services - public API
 *
 * Exports only the domain language API for calendar operations.
 * Implementation details are not exposed.
 *
 * Authentication is its own module with its own public API:
 * ./authentication/index.ts.
 */

export {
  type Booking,
  CalendarApiError,
  createCalendarService,
  type Room,
  UNKNOWN_ROOM,
  UNKNOWN_ROOM_DESCRIPTION,
  type WeekRange,
} from "./CalendarService.ts";
export { isEditable, type UserProfileLike } from "./editability.ts";
