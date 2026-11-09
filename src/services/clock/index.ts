/**
 * Clock service - public API
 *
 * The clock service is the single source of "now"; the pure date helpers
 * (day ranges, week math, Dutch labels) live in the service file, because
 * they are the domain language of dates in this app. Everything else in
 * this module stays private to it.
 */
export type { ClockPort } from "./ClockPort.ts";
export { ClockService } from "./ClockService.ts";
export {
  endOfDay,
  isSameDay,
  longDateLabel,
  startOfDay,
  startOfWeek,
  type WeekdayOption,
  weekdayOptions,
} from "./ClockService.ts";
