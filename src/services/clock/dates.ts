/**
 * Pure date helpers
 *
 * The domain language of dates in this app: day ranges, week math and
 * Dutch date labels. Pure functions over plain Date values, shared by the
 * services (day ranges) and the components (toolbar labels); the current
 * time itself comes from the ClockPort (see ClockPort.ts / SystemClock.ts),
 * so date-dependent logic can be tested deterministically.
 */

/**
 * Check whether two dates are on the same calendar day
 */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Get the start of the day (midnight, local time)
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of the day (23:59:59.999, local time)
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get the Monday of the week the given date falls in
 */
export function startOfWeek(date: Date): Date {
  const monday = new Date(date);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

/**
 * The working days shown in the quick navigation (Monday to Friday),
 * with short Dutch weekday labels derived from the locale
 */
export interface WeekdayOption {
  label: string;
  date: Date;
}

const WEEKDAY_COUNT = 5;

export function weekdayOptions(monday: Date): WeekdayOption[] {
  return Array.from({ length: WEEKDAY_COUNT }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return {
      label: date.toLocaleDateString("nl-NL", { weekday: "narrow" }),
      date,
    };
  });
}

/**
 * Format a date as a long Dutch date label, e.g. "maandag 19 februari 2026"
 */
export function longDateLabel(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
