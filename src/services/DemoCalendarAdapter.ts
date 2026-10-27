/**
 * Demo calendar adapter
 *
 * The adapter that fulfils the CalendarServicePort with demo data: one
 * huge, fully hardcoded array of bookings - room, booker, summary, demo
 * week, weekday, times and editability all in the array, like a JSON
 * fixture. The only two things filled in at runtime, in one pass over
 * the array, are the actual dates (each booking is placed in its demo
 * week relative to the current week) and the booker of the bookings
 * marked editable, which becomes the profile's user. Used by the demo
 * page to review and screenshot all calendar states without touching
 * the real NYMA calendar.
 */

import type { AuthenticatedUser } from "./authentication/AuthenticationServicePort.ts";
import {
  type Booking,
  type CalendarServicePort,
  getThisWeek,
  type Room,
  type WeekRange,
} from "./CalendarServicePort.ts";

import { ROOMS } from "./rooms.ts";

/**
 * The demo week a booking is in, relative to the current week
 */
enum DemoWeek {
  Previous = "previous",
  Current = "current",
  Next = "next",
}

/**
 * How many days each demo week lies from the current week
 */
const WEEK_OFFSET_DAYS: Record<DemoWeek, number> = {
  [DemoWeek.Previous]: -7,
  [DemoWeek.Current]: 0,
  [DemoWeek.Next]: 7,
};

/**
 * One hardcoded demo booking: the room, the booker's name, the summary
 * of the booking event, the demo week and weekday (0 is Monday, 4 is
 * Friday), the start and end time, and whether the profile's user may
 * edit it. The summary is redundant - it repeats the room and booker -
 * but hardcoding it keeps everything editable in one place.
 */
interface DemoBooking {
  room: string;
  booker: string;
  summary: string;
  week: DemoWeek;
  day: number;
  from: string;
  to: string;
  editable: boolean;
}

/**
 * All demo bookings of the previous, current and next week, hardcoded.
 * Every weekday has one completely empty room, one overlapping pair
 * and one editable booking. To change the demo calendar, edit entries
 * here; nothing else needs touching. Each booking is placed in its
 * demo week, relative to the current week. This file is excluded from
 * deno fmt so every booking stays on one line.
 */
const DEMO_BOOKINGS: DemoBooking[] = [
  { room: "Kletshok 03", booker: "Dirk", week: DemoWeek.Previous, day: 0, from: "10:00", to: "12:00", summary: "Kletshok 03 - Dirk", editable: false },
  { room: "Kletshok 03", booker: "Sanne", week: DemoWeek.Previous, day: 0, from: "11:00", to: "13:00", summary: "Kletshok 03 - Sanne", editable: false },
  { room: "Kletshok 03", booker: "Griet", week: DemoWeek.Previous, day: 0, from: "14:00", to: "17:00", summary: "Kletshok 03 - Griet", editable: false },
  { room: "Kletshok 04", booker: "Fatima", week: DemoWeek.Previous, day: 0, from: "10:00", to: "12:00", summary: "Kletshok 04 - Fatima", editable: false },
  { room: "Kletshok 04", booker: "Ozan", week: DemoWeek.Previous, day: 0, from: "12:00", to: "14:00", summary: "Kletshok 04 - Ozan", editable: false },
  { room: "Kletshok 04", booker: "Jorien", week: DemoWeek.Previous, day: 0, from: "14:00", to: "16:00", summary: "Kletshok 04 - Jorien", editable: false },
  { room: "Kletshok 05", booker: "Bèr", week: DemoWeek.Previous, day: 0, from: "11:00", to: "13:00", summary: "Kletshok 05 - Bèr", editable: true },
  { room: "Kletshok 05", booker: "Anneke", week: DemoWeek.Previous, day: 0, from: "13:00", to: "15:00", summary: "Kletshok 05 - Anneke", editable: false },
  { room: "Kletshok 05", booker: "Manon", week: DemoWeek.Previous, day: 0, from: "15:00", to: "16:00", summary: "Kletshok 05 - Manon", editable: false },
  { room: "Kletshok 05", booker: "Dirk", week: DemoWeek.Previous, day: 0, from: "16:00", to: "17:00", summary: "Kletshok 05 - Dirk", editable: false },
  { room: "Stilteruimte", booker: "Sanne", week: DemoWeek.Previous, day: 0, from: "09:00", to: "12:00", summary: "Stilteruimte - Sanne", editable: false },
  { room: "Stilteruimte", booker: "Griet", week: DemoWeek.Previous, day: 0, from: "12:00", to: "14:00", summary: "Stilteruimte - Griet", editable: false },
  { room: "Stilteruimte", booker: "Fatima", week: DemoWeek.Previous, day: 0, from: "14:00", to: "14:30", summary: "Stilteruimte - Fatima", editable: false },
  { room: "Stilteruimte", booker: "Ozan", week: DemoWeek.Previous, day: 0, from: "14:30", to: "15:00", summary: "Stilteruimte - Ozan", editable: false },
  { room: "Tuinkamer", booker: "Jorien", week: DemoWeek.Previous, day: 0, from: "10:00", to: "12:00", summary: "Tuinkamer - Jorien", editable: false },
  { room: "Tuinkamer", booker: "Willem", week: DemoWeek.Previous, day: 0, from: "12:00", to: "14:00", summary: "Tuinkamer - Willem", editable: false },
  { room: "Tuinkamer", booker: "Anneke", week: DemoWeek.Previous, day: 0, from: "14:00", to: "15:00", summary: "Tuinkamer - Anneke", editable: false },
  { room: "Tuinkamer", booker: "Manon", week: DemoWeek.Previous, day: 0, from: "15:00", to: "15:30", summary: "Tuinkamer - Manon", editable: false },
  { room: "Tuinkamer", booker: "Dirk", week: DemoWeek.Previous, day: 0, from: "15:30", to: "16:00", summary: "Tuinkamer - Dirk", editable: false },
  { room: "Vergaderruimte C3", booker: "Sanne", week: DemoWeek.Previous, day: 0, from: "11:00", to: "14:00", summary: "Vergaderruimte C3 - Sanne", editable: false },
  { room: "Vergaderruimte C3", booker: "Griet", week: DemoWeek.Previous, day: 0, from: "14:00", to: "16:00", summary: "Vergaderruimte C3 - Griet", editable: false },
  { room: "Vergaderruimte C3", booker: "Fatima", week: DemoWeek.Previous, day: 0, from: "16:00", to: "17:00", summary: "Vergaderruimte C3 - Fatima", editable: false },
  { room: "Kletshok 03", booker: "Ozan", week: DemoWeek.Previous, day: 1, from: "10:00", to: "12:00", summary: "Kletshok 03 - Ozan", editable: false },
  { room: "Kletshok 03", booker: "Jorien", week: DemoWeek.Previous, day: 1, from: "12:00", to: "14:00", summary: "Kletshok 03 - Jorien", editable: false },
  { room: "Kletshok 03", booker: "Willem", week: DemoWeek.Previous, day: 1, from: "14:00", to: "16:00", summary: "Kletshok 03 - Willem", editable: false },
  { room: "Kletshok 04", booker: "Anneke", week: DemoWeek.Previous, day: 1, from: "10:00", to: "12:00", summary: "Kletshok 04 - Anneke", editable: false },
  { room: "Kletshok 04", booker: "Manon", week: DemoWeek.Previous, day: 1, from: "11:00", to: "13:00", summary: "Kletshok 04 - Manon", editable: false },
  { room: "Kletshok 04", booker: "Dirk", week: DemoWeek.Previous, day: 1, from: "14:00", to: "17:00", summary: "Kletshok 04 - Dirk", editable: false },
  { room: "Kletshok 05", booker: "Sanne", week: DemoWeek.Previous, day: 1, from: "09:00", to: "12:00", summary: "Kletshok 05 - Sanne", editable: false },
  { room: "Kletshok 05", booker: "Griet", week: DemoWeek.Previous, day: 1, from: "12:00", to: "14:00", summary: "Kletshok 05 - Griet", editable: false },
  { room: "Kletshok 05", booker: "Fatima", week: DemoWeek.Previous, day: 1, from: "14:00", to: "14:30", summary: "Kletshok 05 - Fatima", editable: false },
  { room: "Kletshok 05", booker: "Ozan", week: DemoWeek.Previous, day: 1, from: "14:30", to: "15:00", summary: "Kletshok 05 - Ozan", editable: false },
  { room: "Tuinkamer", booker: "Bèr", week: DemoWeek.Previous, day: 1, from: "11:00", to: "14:00", summary: "Tuinkamer - Bèr", editable: true },
  { room: "Tuinkamer", booker: "Willem", week: DemoWeek.Previous, day: 1, from: "14:00", to: "16:00", summary: "Tuinkamer - Willem", editable: false },
  { room: "Tuinkamer", booker: "Anneke", week: DemoWeek.Previous, day: 1, from: "16:00", to: "17:00", summary: "Tuinkamer - Anneke", editable: false },
  { room: "Vergaderruimte C3", booker: "Manon", week: DemoWeek.Previous, day: 1, from: "09:00", to: "11:00", summary: "Vergaderruimte C3 - Manon", editable: false },
  { room: "Vergaderruimte C3", booker: "Dirk", week: DemoWeek.Previous, day: 1, from: "11:00", to: "13:00", summary: "Vergaderruimte C3 - Dirk", editable: false },
  { room: "Vergaderruimte C3", booker: "Sanne", week: DemoWeek.Previous, day: 1, from: "13:00", to: "15:00", summary: "Vergaderruimte C3 - Sanne", editable: false },
  { room: "Unknown", booker: "Griet", week: DemoWeek.Previous, day: 1, from: "10:00", to: "12:00", summary: "Werkplaats overleg - Griet", editable: false },
  { room: "Unknown", booker: "Fatima", week: DemoWeek.Previous, day: 1, from: "12:00", to: "14:00", summary: "Werkplaats overleg - Fatima", editable: false },
  { room: "Unknown", booker: "Ozan", week: DemoWeek.Previous, day: 1, from: "14:00", to: "15:00", summary: "Werkplaats overleg - Ozan", editable: false },
  { room: "Unknown", booker: "Jorien", week: DemoWeek.Previous, day: 1, from: "15:00", to: "16:00", summary: "Werkplaats overleg - Jorien", editable: false },
  { room: "Kletshok 03", booker: "Willem", week: DemoWeek.Previous, day: 2, from: "11:00", to: "13:00", summary: "Kletshok 03 - Willem", editable: false },
  { room: "Kletshok 03", booker: "Anneke", week: DemoWeek.Previous, day: 2, from: "13:00", to: "15:00", summary: "Kletshok 03 - Anneke", editable: false },
  { room: "Kletshok 03", booker: "Manon", week: DemoWeek.Previous, day: 2, from: "15:00", to: "16:00", summary: "Kletshok 03 - Manon", editable: false },
  { room: "Kletshok 03", booker: "Dirk", week: DemoWeek.Previous, day: 2, from: "16:00", to: "17:00", summary: "Kletshok 03 - Dirk", editable: false },
  { room: "Kletshok 04", booker: "Sanne", week: DemoWeek.Previous, day: 2, from: "09:00", to: "12:00", summary: "Kletshok 04 - Sanne", editable: false },
  { room: "Kletshok 04", booker: "Griet", week: DemoWeek.Previous, day: 2, from: "12:00", to: "14:00", summary: "Kletshok 04 - Griet", editable: false },
  { room: "Kletshok 04", booker: "Fatima", week: DemoWeek.Previous, day: 2, from: "14:00", to: "14:30", summary: "Kletshok 04 - Fatima", editable: false },
  { room: "Kletshok 04", booker: "Ozan", week: DemoWeek.Previous, day: 2, from: "14:30", to: "15:00", summary: "Kletshok 04 - Ozan", editable: false },
  { room: "Kletshok 05", booker: "Jorien", week: DemoWeek.Previous, day: 2, from: "10:00", to: "12:00", summary: "Kletshok 05 - Jorien", editable: false },
  { room: "Kletshok 05", booker: "Willem", week: DemoWeek.Previous, day: 2, from: "11:00", to: "13:00", summary: "Kletshok 05 - Willem", editable: false },
  { room: "Kletshok 05", booker: "Anneke", week: DemoWeek.Previous, day: 2, from: "14:00", to: "17:00", summary: "Kletshok 05 - Anneke", editable: false },
  { room: "Stilteruimte", booker: "Bèr", week: DemoWeek.Previous, day: 2, from: "11:00", to: "14:00", summary: "Stilteruimte - Bèr", editable: true },
  { room: "Stilteruimte", booker: "Dirk", week: DemoWeek.Previous, day: 2, from: "14:00", to: "16:00", summary: "Stilteruimte - Dirk", editable: false },
  { room: "Stilteruimte", booker: "Sanne", week: DemoWeek.Previous, day: 2, from: "16:00", to: "17:00", summary: "Stilteruimte - Sanne", editable: false },
  { room: "Tuinkamer", booker: "Griet", week: DemoWeek.Previous, day: 2, from: "09:00", to: "11:00", summary: "Tuinkamer - Griet", editable: false },
  { room: "Tuinkamer", booker: "Fatima", week: DemoWeek.Previous, day: 2, from: "11:00", to: "13:00", summary: "Tuinkamer - Fatima", editable: false },
  { room: "Tuinkamer", booker: "Ozan", week: DemoWeek.Previous, day: 2, from: "13:00", to: "15:00", summary: "Tuinkamer - Ozan", editable: false },
  { room: "Unknown", booker: "Jorien", week: DemoWeek.Previous, day: 2, from: "11:00", to: "14:00", summary: "Kletsruimte 03 - Jorien", editable: false },
  { room: "Unknown", booker: "Willem", week: DemoWeek.Previous, day: 2, from: "14:00", to: "16:00", summary: "Hok 2 - Willem", editable: false },
  { room: "Unknown", booker: "Anneke", week: DemoWeek.Previous, day: 2, from: "16:00", to: "16:30", summary: "Vergaderplek - Anneke", editable: false },
  { room: "Unknown", booker: "Manon", week: DemoWeek.Previous, day: 2, from: "16:30", to: "17:00", summary: "Werkplaats overleg - Manon", editable: false },
  { room: "Kletshok 03", booker: "Dirk", week: DemoWeek.Previous, day: 3, from: "09:00", to: "12:00", summary: "Kletshok 03 - Dirk", editable: false },
  { room: "Kletshok 03", booker: "Sanne", week: DemoWeek.Previous, day: 3, from: "12:00", to: "14:00", summary: "Kletshok 03 - Sanne", editable: false },
  { room: "Kletshok 03", booker: "Griet", week: DemoWeek.Previous, day: 3, from: "14:00", to: "14:30", summary: "Kletshok 03 - Griet", editable: false },
  { room: "Kletshok 03", booker: "Fatima", week: DemoWeek.Previous, day: 3, from: "14:30", to: "15:00", summary: "Kletshok 03 - Fatima", editable: false },
  { room: "Kletshok 04", booker: "Bèr", week: DemoWeek.Previous, day: 3, from: "10:00", to: "12:00", summary: "Kletshok 04 - Bèr", editable: true },
  { room: "Kletshok 04", booker: "Jorien", week: DemoWeek.Previous, day: 3, from: "12:00", to: "14:00", summary: "Kletshok 04 - Jorien", editable: false },
  { room: "Kletshok 04", booker: "Willem", week: DemoWeek.Previous, day: 3, from: "14:00", to: "15:00", summary: "Kletshok 04 - Willem", editable: false },
  { room: "Kletshok 04", booker: "Anneke", week: DemoWeek.Previous, day: 3, from: "15:00", to: "15:30", summary: "Kletshok 04 - Anneke", editable: false },
  { room: "Kletshok 04", booker: "Manon", week: DemoWeek.Previous, day: 3, from: "15:30", to: "16:00", summary: "Kletshok 04 - Manon", editable: false },
  { room: "Kletshok 05", booker: "Dirk", week: DemoWeek.Previous, day: 3, from: "11:00", to: "14:00", summary: "Kletshok 05 - Dirk", editable: false },
  { room: "Kletshok 05", booker: "Sanne", week: DemoWeek.Previous, day: 3, from: "14:00", to: "16:00", summary: "Kletshok 05 - Sanne", editable: false },
  { room: "Kletshok 05", booker: "Griet", week: DemoWeek.Previous, day: 3, from: "16:00", to: "17:00", summary: "Kletshok 05 - Griet", editable: false },
  { room: "Stilteruimte", booker: "Fatima", week: DemoWeek.Previous, day: 3, from: "09:00", to: "11:00", summary: "Stilteruimte - Fatima", editable: false },
  { room: "Stilteruimte", booker: "Ozan", week: DemoWeek.Previous, day: 3, from: "11:00", to: "13:00", summary: "Stilteruimte - Ozan", editable: false },
  { room: "Stilteruimte", booker: "Jorien", week: DemoWeek.Previous, day: 3, from: "13:00", to: "15:00", summary: "Stilteruimte - Jorien", editable: false },
  { room: "Vergaderruimte C3", booker: "Willem", week: DemoWeek.Previous, day: 3, from: "10:00", to: "12:00", summary: "Vergaderruimte C3 - Willem", editable: false },
  { room: "Vergaderruimte C3", booker: "Anneke", week: DemoWeek.Previous, day: 3, from: "11:00", to: "13:00", summary: "Vergaderruimte C3 - Anneke", editable: false },
  { room: "Vergaderruimte C3", booker: "Manon", week: DemoWeek.Previous, day: 3, from: "14:00", to: "17:00", summary: "Vergaderruimte C3 - Manon", editable: false },
  { room: "Unknown", booker: "Dirk", week: DemoWeek.Previous, day: 3, from: "09:00", to: "11:00", summary: "Werkplaats overleg - Dirk", editable: false },
  { room: "Unknown", booker: "Sanne", week: DemoWeek.Previous, day: 3, from: "11:00", to: "13:00", summary: "Werkplaats overleg - Sanne", editable: false },
  { room: "Unknown", booker: "Griet", week: DemoWeek.Previous, day: 3, from: "13:00", to: "14:00", summary: "Werkplaats overleg - Griet", editable: false },
  { room: "Unknown", booker: "Fatima", week: DemoWeek.Previous, day: 3, from: "14:00", to: "14:30", summary: "Werkplaats overleg - Fatima", editable: false },
  { room: "Unknown", booker: "Ozan", week: DemoWeek.Previous, day: 3, from: "14:30", to: "15:00", summary: "Werkplaats overleg - Ozan", editable: false },
  { room: "Kletshok 03", booker: "Bèr", week: DemoWeek.Previous, day: 4, from: "10:00", to: "12:00", summary: "Kletshok 03 - Bèr", editable: true },
  { room: "Kletshok 03", booker: "Willem", week: DemoWeek.Previous, day: 4, from: "12:00", to: "14:00", summary: "Kletshok 03 - Willem", editable: false },
  { room: "Kletshok 03", booker: "Anneke", week: DemoWeek.Previous, day: 4, from: "14:00", to: "15:00", summary: "Kletshok 03 - Anneke", editable: false },
  { room: "Kletshok 03", booker: "Manon", week: DemoWeek.Previous, day: 4, from: "15:00", to: "15:30", summary: "Kletshok 03 - Manon", editable: false },
  { room: "Kletshok 03", booker: "Dirk", week: DemoWeek.Previous, day: 4, from: "15:30", to: "16:00", summary: "Kletshok 03 - Dirk", editable: false },
  { room: "Kletshok 04", booker: "Sanne", week: DemoWeek.Previous, day: 4, from: "11:00", to: "14:00", summary: "Kletshok 04 - Sanne", editable: false },
  { room: "Kletshok 04", booker: "Griet", week: DemoWeek.Previous, day: 4, from: "14:00", to: "16:00", summary: "Kletshok 04 - Griet", editable: false },
  { room: "Kletshok 04", booker: "Fatima", week: DemoWeek.Previous, day: 4, from: "16:00", to: "17:00", summary: "Kletshok 04 - Fatima", editable: false },
  { room: "Stilteruimte", booker: "Ozan", week: DemoWeek.Previous, day: 4, from: "10:00", to: "12:00", summary: "Stilteruimte - Ozan", editable: false },
  { room: "Stilteruimte", booker: "Jorien", week: DemoWeek.Previous, day: 4, from: "11:00", to: "13:00", summary: "Stilteruimte - Jorien", editable: false },
  { room: "Stilteruimte", booker: "Willem", week: DemoWeek.Previous, day: 4, from: "14:00", to: "17:00", summary: "Stilteruimte - Willem", editable: false },
  { room: "Tuinkamer", booker: "Anneke", week: DemoWeek.Previous, day: 4, from: "11:00", to: "14:00", summary: "Tuinkamer - Anneke", editable: false },
  { room: "Tuinkamer", booker: "Manon", week: DemoWeek.Previous, day: 4, from: "14:00", to: "16:00", summary: "Tuinkamer - Manon", editable: false },
  { room: "Tuinkamer", booker: "Dirk", week: DemoWeek.Previous, day: 4, from: "16:00", to: "16:30", summary: "Tuinkamer - Dirk", editable: false },
  { room: "Tuinkamer", booker: "Sanne", week: DemoWeek.Previous, day: 4, from: "16:30", to: "17:00", summary: "Tuinkamer - Sanne", editable: false },
  { room: "Vergaderruimte C3", booker: "Griet", week: DemoWeek.Previous, day: 4, from: "09:00", to: "11:00", summary: "Vergaderruimte C3 - Griet", editable: false },
  { room: "Vergaderruimte C3", booker: "Fatima", week: DemoWeek.Previous, day: 4, from: "11:00", to: "13:00", summary: "Vergaderruimte C3 - Fatima", editable: false },
  { room: "Vergaderruimte C3", booker: "Ozan", week: DemoWeek.Previous, day: 4, from: "13:00", to: "14:00", summary: "Vergaderruimte C3 - Ozan", editable: false },
  { room: "Vergaderruimte C3", booker: "Jorien", week: DemoWeek.Previous, day: 4, from: "14:00", to: "14:30", summary: "Vergaderruimte C3 - Jorien", editable: false },
  { room: "Vergaderruimte C3", booker: "Willem", week: DemoWeek.Previous, day: 4, from: "14:30", to: "15:00", summary: "Vergaderruimte C3 - Willem", editable: false },
  { room: "Unknown", booker: "Anneke", week: DemoWeek.Previous, day: 4, from: "10:00", to: "13:00", summary: "Werkplaats overleg - Anneke", editable: false },
  { room: "Unknown", booker: "Manon", week: DemoWeek.Previous, day: 4, from: "13:00", to: "15:00", summary: "Werkplaats overleg - Manon", editable: false },
  { room: "Unknown", booker: "Dirk", week: DemoWeek.Previous, day: 4, from: "15:00", to: "16:00", summary: "Werkplaats overleg - Dirk", editable: false },
  { room: "Kletshok 03", booker: "Sanne", week: DemoWeek.Current, day: 0, from: "10:00", to: "12:00", summary: "Kletshok 03 - Sanne", editable: false },
  { room: "Kletshok 03", booker: "Griet", week: DemoWeek.Current, day: 0, from: "11:00", to: "13:00", summary: "Kletshok 03 - Griet", editable: false },
  { room: "Kletshok 03", booker: "Fatima", week: DemoWeek.Current, day: 0, from: "14:00", to: "15:00", summary: "Kletshok 03 - Fatima", editable: false },
  { room: "Kletshok 04", booker: "Ozan", week: DemoWeek.Current, day: 0, from: "10:00", to: "12:00", summary: "Kletshok 04 - Ozan", editable: false },
  { room: "Kletshok 04", booker: "Jorien", week: DemoWeek.Current, day: 0, from: "12:00", to: "14:00", summary: "Kletshok 04 - Jorien", editable: false },
  { room: "Kletshok 05", booker: "Bèr", week: DemoWeek.Current, day: 0, from: "11:00", to: "13:00", summary: "Kletshok 05 - Bèr", editable: true },
  { room: "Kletshok 05", booker: "Anneke", week: DemoWeek.Current, day: 0, from: "13:00", to: "14:00", summary: "Kletshok 05 - Anneke", editable: false },
  { room: "Kletshok 05", booker: "Manon", week: DemoWeek.Current, day: 0, from: "14:00", to: "15:00", summary: "Kletshok 05 - Manon", editable: false },
  { room: "Stilteruimte", booker: "Dirk", week: DemoWeek.Current, day: 0, from: "09:00", to: "12:00", summary: "Stilteruimte - Dirk", editable: false },
  { room: "Stilteruimte", booker: "Sanne", week: DemoWeek.Current, day: 0, from: "12:00", to: "12:30", summary: "Stilteruimte - Sanne", editable: false },
  { room: "Stilteruimte", booker: "Griet", week: DemoWeek.Current, day: 0, from: "12:30", to: "13:00", summary: "Stilteruimte - Griet", editable: false },
  { room: "Tuinkamer", booker: "Fatima", week: DemoWeek.Current, day: 0, from: "10:00", to: "12:00", summary: "Tuinkamer - Fatima", editable: false },
  { room: "Tuinkamer", booker: "Ozan", week: DemoWeek.Current, day: 0, from: "12:00", to: "13:00", summary: "Tuinkamer - Ozan", editable: false },
  { room: "Tuinkamer", booker: "Jorien", week: DemoWeek.Current, day: 0, from: "13:00", to: "13:30", summary: "Tuinkamer - Jorien", editable: false },
  { room: "Tuinkamer", booker: "Willem", week: DemoWeek.Current, day: 0, from: "13:30", to: "14:00", summary: "Tuinkamer - Willem", editable: false },
  { room: "Vergaderruimte C3", booker: "Anneke", week: DemoWeek.Current, day: 0, from: "11:00", to: "14:00", summary: "Vergaderruimte C3 - Anneke", editable: false },
  { room: "Vergaderruimte C3", booker: "Manon", week: DemoWeek.Current, day: 0, from: "14:00", to: "15:00", summary: "Vergaderruimte C3 - Manon", editable: false },
  { room: "Kletshok 03", booker: "Dirk", week: DemoWeek.Current, day: 1, from: "10:00", to: "12:00", summary: "Kletshok 03 - Dirk", editable: false },
  { room: "Kletshok 03", booker: "Sanne", week: DemoWeek.Current, day: 1, from: "12:00", to: "14:00", summary: "Kletshok 03 - Sanne", editable: false },
  { room: "Kletshok 04", booker: "Griet", week: DemoWeek.Current, day: 1, from: "10:00", to: "12:00", summary: "Kletshok 04 - Griet", editable: false },
  { room: "Kletshok 04", booker: "Fatima", week: DemoWeek.Current, day: 1, from: "11:00", to: "13:00", summary: "Kletshok 04 - Fatima", editable: false },
  { room: "Kletshok 04", booker: "Ozan", week: DemoWeek.Current, day: 1, from: "14:00", to: "15:00", summary: "Kletshok 04 - Ozan", editable: false },
  { room: "Kletshok 05", booker: "Jorien", week: DemoWeek.Current, day: 1, from: "09:00", to: "12:00", summary: "Kletshok 05 - Jorien", editable: false },
  { room: "Kletshok 05", booker: "Willem", week: DemoWeek.Current, day: 1, from: "12:00", to: "12:30", summary: "Kletshok 05 - Willem", editable: false },
  { room: "Kletshok 05", booker: "Anneke", week: DemoWeek.Current, day: 1, from: "12:30", to: "13:00", summary: "Kletshok 05 - Anneke", editable: false },
  { room: "Tuinkamer", booker: "Bèr", week: DemoWeek.Current, day: 1, from: "11:00", to: "14:00", summary: "Tuinkamer - Bèr", editable: true },
  { room: "Tuinkamer", booker: "Dirk", week: DemoWeek.Current, day: 1, from: "14:00", to: "15:00", summary: "Tuinkamer - Dirk", editable: false },
  { room: "Vergaderruimte C3", booker: "Sanne", week: DemoWeek.Current, day: 1, from: "09:00", to: "11:00", summary: "Vergaderruimte C3 - Sanne", editable: false },
  { room: "Vergaderruimte C3", booker: "Griet", week: DemoWeek.Current, day: 1, from: "11:00", to: "13:00", summary: "Vergaderruimte C3 - Griet", editable: false },
  { room: "Unknown", booker: "Fatima", week: DemoWeek.Current, day: 1, from: "10:00", to: "12:00", summary: "Werkplaats overleg - Fatima", editable: false },
  { room: "Unknown", booker: "Ozan", week: DemoWeek.Current, day: 1, from: "12:00", to: "13:00", summary: "Werkplaats overleg - Ozan", editable: false },
  { room: "Unknown", booker: "Jorien", week: DemoWeek.Current, day: 1, from: "13:00", to: "14:00", summary: "Werkplaats overleg - Jorien", editable: false },
  { room: "Kletshok 03", booker: "Willem", week: DemoWeek.Current, day: 2, from: "11:00", to: "13:00", summary: "Kletshok 03 - Willem", editable: false },
  { room: "Kletshok 03", booker: "Anneke", week: DemoWeek.Current, day: 2, from: "13:00", to: "14:00", summary: "Kletshok 03 - Anneke", editable: false },
  { room: "Kletshok 03", booker: "Manon", week: DemoWeek.Current, day: 2, from: "14:00", to: "15:00", summary: "Kletshok 03 - Manon", editable: false },
  { room: "Kletshok 04", booker: "Dirk", week: DemoWeek.Current, day: 2, from: "09:00", to: "12:00", summary: "Kletshok 04 - Dirk", editable: false },
  { room: "Kletshok 04", booker: "Sanne", week: DemoWeek.Current, day: 2, from: "12:00", to: "12:30", summary: "Kletshok 04 - Sanne", editable: false },
  { room: "Kletshok 04", booker: "Griet", week: DemoWeek.Current, day: 2, from: "12:30", to: "13:00", summary: "Kletshok 04 - Griet", editable: false },
  { room: "Kletshok 05", booker: "Fatima", week: DemoWeek.Current, day: 2, from: "10:00", to: "12:00", summary: "Kletshok 05 - Fatima", editable: false },
  { room: "Kletshok 05", booker: "Ozan", week: DemoWeek.Current, day: 2, from: "11:00", to: "13:00", summary: "Kletshok 05 - Ozan", editable: false },
  { room: "Kletshok 05", booker: "Jorien", week: DemoWeek.Current, day: 2, from: "14:00", to: "15:00", summary: "Kletshok 05 - Jorien", editable: false },
  { room: "Stilteruimte", booker: "Bèr", week: DemoWeek.Current, day: 2, from: "11:00", to: "14:00", summary: "Stilteruimte - Bèr", editable: true },
  { room: "Stilteruimte", booker: "Anneke", week: DemoWeek.Current, day: 2, from: "14:00", to: "15:00", summary: "Stilteruimte - Anneke", editable: false },
  { room: "Tuinkamer", booker: "Manon", week: DemoWeek.Current, day: 2, from: "09:00", to: "11:00", summary: "Tuinkamer - Manon", editable: false },
  { room: "Tuinkamer", booker: "Dirk", week: DemoWeek.Current, day: 2, from: "11:00", to: "13:00", summary: "Tuinkamer - Dirk", editable: false },
  { room: "Unknown", booker: "Sanne", week: DemoWeek.Current, day: 2, from: "11:00", to: "14:00", summary: "Werkplaats overleg - Sanne", editable: false },
  { room: "Unknown", booker: "Griet", week: DemoWeek.Current, day: 2, from: "14:00", to: "14:30", summary: "Werkplaats overleg - Griet", editable: false },
  { room: "Unknown", booker: "Fatima", week: DemoWeek.Current, day: 2, from: "14:30", to: "15:00", summary: "Werkplaats overleg - Fatima", editable: false },
  { room: "Kletshok 03", booker: "Ozan", week: DemoWeek.Current, day: 3, from: "09:00", to: "12:00", summary: "Kletshok 03 - Ozan", editable: false },
  { room: "Kletshok 03", booker: "Jorien", week: DemoWeek.Current, day: 3, from: "12:00", to: "12:30", summary: "Kletshok 03 - Jorien", editable: false },
  { room: "Kletshok 03", booker: "Willem", week: DemoWeek.Current, day: 3, from: "12:30", to: "13:00", summary: "Kletshok 03 - Willem", editable: false },
  { room: "Kletshok 04", booker: "Bèr", week: DemoWeek.Current, day: 3, from: "10:00", to: "12:00", summary: "Kletshok 04 - Bèr", editable: true },
  { room: "Kletshok 04", booker: "Manon", week: DemoWeek.Current, day: 3, from: "12:00", to: "13:00", summary: "Kletshok 04 - Manon", editable: false },
  { room: "Kletshok 04", booker: "Dirk", week: DemoWeek.Current, day: 3, from: "13:00", to: "13:30", summary: "Kletshok 04 - Dirk", editable: false },
  { room: "Kletshok 04", booker: "Sanne", week: DemoWeek.Current, day: 3, from: "13:30", to: "14:00", summary: "Kletshok 04 - Sanne", editable: false },
  { room: "Kletshok 05", booker: "Griet", week: DemoWeek.Current, day: 3, from: "11:00", to: "14:00", summary: "Kletshok 05 - Griet", editable: false },
  { room: "Kletshok 05", booker: "Fatima", week: DemoWeek.Current, day: 3, from: "14:00", to: "15:00", summary: "Kletshok 05 - Fatima", editable: false },
  { room: "Stilteruimte", booker: "Ozan", week: DemoWeek.Current, day: 3, from: "09:00", to: "11:00", summary: "Stilteruimte - Ozan", editable: false },
  { room: "Stilteruimte", booker: "Jorien", week: DemoWeek.Current, day: 3, from: "11:00", to: "13:00", summary: "Stilteruimte - Jorien", editable: false },
  { room: "Vergaderruimte C3", booker: "Willem", week: DemoWeek.Current, day: 3, from: "10:00", to: "12:00", summary: "Vergaderruimte C3 - Willem", editable: false },
  { room: "Vergaderruimte C3", booker: "Anneke", week: DemoWeek.Current, day: 3, from: "11:00", to: "13:00", summary: "Vergaderruimte C3 - Anneke", editable: false },
  { room: "Vergaderruimte C3", booker: "Manon", week: DemoWeek.Current, day: 3, from: "14:00", to: "15:00", summary: "Vergaderruimte C3 - Manon", editable: false },
  { room: "Unknown", booker: "Dirk", week: DemoWeek.Current, day: 3, from: "09:00", to: "11:00", summary: "Werkplaats overleg - Dirk", editable: false },
  { room: "Unknown", booker: "Sanne", week: DemoWeek.Current, day: 3, from: "11:00", to: "12:00", summary: "Werkplaats overleg - Sanne", editable: false },
  { room: "Unknown", booker: "Griet", week: DemoWeek.Current, day: 3, from: "12:00", to: "12:30", summary: "Werkplaats overleg - Griet", editable: false },
  { room: "Unknown", booker: "Fatima", week: DemoWeek.Current, day: 3, from: "12:30", to: "13:00", summary: "Werkplaats overleg - Fatima", editable: false },
  { room: "Kletshok 03", booker: "Bèr", week: DemoWeek.Current, day: 4, from: "10:00", to: "12:00", summary: "Kletshok 03 - Bèr", editable: true },
  { room: "Kletshok 03", booker: "Jorien", week: DemoWeek.Current, day: 4, from: "12:00", to: "13:00", summary: "Kletshok 03 - Jorien", editable: false },
  { room: "Kletshok 03", booker: "Willem", week: DemoWeek.Current, day: 4, from: "13:00", to: "13:30", summary: "Kletshok 03 - Willem", editable: false },
  { room: "Kletshok 03", booker: "Anneke", week: DemoWeek.Current, day: 4, from: "13:30", to: "14:00", summary: "Kletshok 03 - Anneke", editable: false },
  { room: "Kletshok 04", booker: "Manon", week: DemoWeek.Current, day: 4, from: "11:00", to: "14:00", summary: "Kletshok 04 - Manon", editable: false },
  { room: "Kletshok 04", booker: "Dirk", week: DemoWeek.Current, day: 4, from: "14:00", to: "15:00", summary: "Kletshok 04 - Dirk", editable: false },
  { room: "Stilteruimte", booker: "Sanne", week: DemoWeek.Current, day: 4, from: "10:00", to: "12:00", summary: "Stilteruimte - Sanne", editable: false },
  { room: "Stilteruimte", booker: "Griet", week: DemoWeek.Current, day: 4, from: "11:00", to: "13:00", summary: "Stilteruimte - Griet", editable: false },
  { room: "Stilteruimte", booker: "Fatima", week: DemoWeek.Current, day: 4, from: "14:00", to: "15:00", summary: "Stilteruimte - Fatima", editable: false },
  { room: "Tuinkamer", booker: "Ozan", week: DemoWeek.Current, day: 4, from: "11:00", to: "14:00", summary: "Tuinkamer - Ozan", editable: false },
  { room: "Tuinkamer", booker: "Jorien", week: DemoWeek.Current, day: 4, from: "14:00", to: "14:30", summary: "Tuinkamer - Jorien", editable: false },
  { room: "Tuinkamer", booker: "Willem", week: DemoWeek.Current, day: 4, from: "14:30", to: "15:00", summary: "Tuinkamer - Willem", editable: false },
  { room: "Vergaderruimte C3", booker: "Anneke", week: DemoWeek.Current, day: 4, from: "09:00", to: "11:00", summary: "Vergaderruimte C3 - Anneke", editable: false },
  { room: "Vergaderruimte C3", booker: "Manon", week: DemoWeek.Current, day: 4, from: "11:00", to: "12:00", summary: "Vergaderruimte C3 - Manon", editable: false },
  { room: "Vergaderruimte C3", booker: "Dirk", week: DemoWeek.Current, day: 4, from: "12:00", to: "12:30", summary: "Vergaderruimte C3 - Dirk", editable: false },
  { room: "Vergaderruimte C3", booker: "Sanne", week: DemoWeek.Current, day: 4, from: "12:30", to: "13:00", summary: "Vergaderruimte C3 - Sanne", editable: false },
  { room: "Unknown", booker: "Griet", week: DemoWeek.Current, day: 4, from: "10:00", to: "13:00", summary: "Werkplaats overleg - Griet", editable: false },
  { room: "Unknown", booker: "Fatima", week: DemoWeek.Current, day: 4, from: "13:00", to: "14:00", summary: "Werkplaats overleg - Fatima", editable: false },
  { room: "Kletshok 03", booker: "Ozan", week: DemoWeek.Next, day: 0, from: "10:00", to: "11:30", summary: "Kletshok 03 - Ozan", editable: false },
  { room: "Kletshok 03", booker: "Jorien", week: DemoWeek.Next, day: 0, from: "11:00", to: "12:00", summary: "Kletshok 03 - Jorien", editable: false },
  { room: "Kletshok 04", booker: "Willem", week: DemoWeek.Next, day: 0, from: "10:00", to: "11:00", summary: "Kletshok 04 - Willem", editable: false },
  { room: "Kletshok 04", booker: "Anneke", week: DemoWeek.Next, day: 0, from: "11:00", to: "12:00", summary: "Kletshok 04 - Anneke", editable: false },
  { room: "Kletshok 05", booker: "Bèr", week: DemoWeek.Next, day: 0, from: "11:00", to: "12:00", summary: "Kletshok 05 - Bèr", editable: true },
  { room: "Kletshok 05", booker: "Dirk", week: DemoWeek.Next, day: 0, from: "12:00", to: "12:30", summary: "Kletshok 05 - Dirk", editable: false },
  { room: "Kletshok 05", booker: "Sanne", week: DemoWeek.Next, day: 0, from: "12:30", to: "13:00", summary: "Kletshok 05 - Sanne", editable: false },
  { room: "Stilteruimte", booker: "Griet", week: DemoWeek.Next, day: 0, from: "09:00", to: "09:30", summary: "Stilteruimte - Griet", editable: false },
  { room: "Stilteruimte", booker: "Fatima", week: DemoWeek.Next, day: 0, from: "09:30", to: "10:00", summary: "Stilteruimte - Fatima", editable: false },
  { room: "Stilteruimte", booker: "Ozan", week: DemoWeek.Next, day: 0, from: "10:00", to: "11:00", summary: "Stilteruimte - Ozan", editable: false },
  { room: "Tuinkamer", booker: "Jorien", week: DemoWeek.Next, day: 0, from: "10:00", to: "12:00", summary: "Tuinkamer - Jorien", editable: false },
  { room: "Vergaderruimte C3", booker: "Willem", week: DemoWeek.Next, day: 0, from: "11:00", to: "12:00", summary: "Vergaderruimte C3 - Willem", editable: false },
  { room: "Vergaderruimte C3", booker: "Anneke", week: DemoWeek.Next, day: 0, from: "12:00", to: "13:00", summary: "Vergaderruimte C3 - Anneke", editable: false },
  { room: "Kletshok 03", booker: "Manon", week: DemoWeek.Next, day: 1, from: "10:00", to: "11:00", summary: "Kletshok 03 - Manon", editable: false },
  { room: "Kletshok 03", booker: "Dirk", week: DemoWeek.Next, day: 1, from: "11:00", to: "12:00", summary: "Kletshok 03 - Dirk", editable: false },
  { room: "Kletshok 04", booker: "Sanne", week: DemoWeek.Next, day: 1, from: "10:00", to: "11:30", summary: "Kletshok 04 - Sanne", editable: false },
  { room: "Kletshok 04", booker: "Griet", week: DemoWeek.Next, day: 1, from: "11:00", to: "12:00", summary: "Kletshok 04 - Griet", editable: false },
  { room: "Kletshok 05", booker: "Fatima", week: DemoWeek.Next, day: 1, from: "09:00", to: "09:30", summary: "Kletshok 05 - Fatima", editable: false },
  { room: "Kletshok 05", booker: "Ozan", week: DemoWeek.Next, day: 1, from: "09:30", to: "10:00", summary: "Kletshok 05 - Ozan", editable: false },
  { room: "Kletshok 05", booker: "Jorien", week: DemoWeek.Next, day: 1, from: "10:00", to: "11:00", summary: "Kletshok 05 - Jorien", editable: false },
  { room: "Tuinkamer", booker: "Bèr", week: DemoWeek.Next, day: 1, from: "11:00", to: "12:00", summary: "Tuinkamer - Bèr", editable: true },
  { room: "Tuinkamer", booker: "Anneke", week: DemoWeek.Next, day: 1, from: "12:00", to: "13:00", summary: "Tuinkamer - Anneke", editable: false },
  { room: "Vergaderruimte C3", booker: "Manon", week: DemoWeek.Next, day: 1, from: "09:00", to: "10:00", summary: "Vergaderruimte C3 - Manon", editable: false },
  { room: "Vergaderruimte C3", booker: "Dirk", week: DemoWeek.Next, day: 1, from: "10:00", to: "10:30", summary: "Vergaderruimte C3 - Dirk", editable: false },
  { room: "Vergaderruimte C3", booker: "Sanne", week: DemoWeek.Next, day: 1, from: "10:30", to: "11:00", summary: "Vergaderruimte C3 - Sanne", editable: false },
  { room: "Unknown", booker: "Griet", week: DemoWeek.Next, day: 1, from: "10:00", to: "10:30", summary: "Werkplaats overleg - Griet", editable: false },
  { room: "Unknown", booker: "Fatima", week: DemoWeek.Next, day: 1, from: "10:30", to: "11:00", summary: "Werkplaats overleg - Fatima", editable: false },
  { room: "Unknown", booker: "Ozan", week: DemoWeek.Next, day: 1, from: "11:00", to: "12:00", summary: "Werkplaats overleg - Ozan", editable: false },
  { room: "Kletshok 03", booker: "Jorien", week: DemoWeek.Next, day: 2, from: "11:00", to: "12:00", summary: "Kletshok 03 - Jorien", editable: false },
  { room: "Kletshok 03", booker: "Willem", week: DemoWeek.Next, day: 2, from: "12:00", to: "12:30", summary: "Kletshok 03 - Willem", editable: false },
  { room: "Kletshok 03", booker: "Anneke", week: DemoWeek.Next, day: 2, from: "12:30", to: "13:00", summary: "Kletshok 03 - Anneke", editable: false },
  { room: "Kletshok 04", booker: "Manon", week: DemoWeek.Next, day: 2, from: "09:00", to: "09:30", summary: "Kletshok 04 - Manon", editable: false },
  { room: "Kletshok 04", booker: "Dirk", week: DemoWeek.Next, day: 2, from: "09:30", to: "10:00", summary: "Kletshok 04 - Dirk", editable: false },
  { room: "Kletshok 04", booker: "Sanne", week: DemoWeek.Next, day: 2, from: "10:00", to: "11:00", summary: "Kletshok 04 - Sanne", editable: false },
  { room: "Kletshok 05", booker: "Griet", week: DemoWeek.Next, day: 2, from: "10:00", to: "11:30", summary: "Kletshok 05 - Griet", editable: false },
  { room: "Kletshok 05", booker: "Fatima", week: DemoWeek.Next, day: 2, from: "11:00", to: "12:00", summary: "Kletshok 05 - Fatima", editable: false },
  { room: "Stilteruimte", booker: "Bèr", week: DemoWeek.Next, day: 2, from: "11:00", to: "12:00", summary: "Stilteruimte - Bèr", editable: true },
  { room: "Stilteruimte", booker: "Jorien", week: DemoWeek.Next, day: 2, from: "12:00", to: "13:00", summary: "Stilteruimte - Jorien", editable: false },
  { room: "Tuinkamer", booker: "Willem", week: DemoWeek.Next, day: 2, from: "09:00", to: "10:00", summary: "Tuinkamer - Willem", editable: false },
  { room: "Tuinkamer", booker: "Anneke", week: DemoWeek.Next, day: 2, from: "10:00", to: "10:30", summary: "Tuinkamer - Anneke", editable: false },
  { room: "Tuinkamer", booker: "Manon", week: DemoWeek.Next, day: 2, from: "10:30", to: "11:00", summary: "Tuinkamer - Manon", editable: false },
  { room: "Unknown", booker: "Dirk", week: DemoWeek.Next, day: 2, from: "11:00", to: "13:00", summary: "Werkplaats overleg - Dirk", editable: false },
  { room: "Kletshok 03", booker: "Sanne", week: DemoWeek.Next, day: 3, from: "09:00", to: "09:30", summary: "Kletshok 03 - Sanne", editable: false },
  { room: "Kletshok 03", booker: "Griet", week: DemoWeek.Next, day: 3, from: "09:30", to: "10:00", summary: "Kletshok 03 - Griet", editable: false },
  { room: "Kletshok 03", booker: "Fatima", week: DemoWeek.Next, day: 3, from: "10:00", to: "11:00", summary: "Kletshok 03 - Fatima", editable: false },
  { room: "Kletshok 04", booker: "Bèr", week: DemoWeek.Next, day: 3, from: "10:00", to: "12:00", summary: "Kletshok 04 - Bèr", editable: true },
  { room: "Kletshok 05", booker: "Jorien", week: DemoWeek.Next, day: 3, from: "11:00", to: "12:00", summary: "Kletshok 05 - Jorien", editable: false },
  { room: "Kletshok 05", booker: "Willem", week: DemoWeek.Next, day: 3, from: "12:00", to: "13:00", summary: "Kletshok 05 - Willem", editable: false },
  { room: "Stilteruimte", booker: "Anneke", week: DemoWeek.Next, day: 3, from: "09:00", to: "10:00", summary: "Stilteruimte - Anneke", editable: false },
  { room: "Stilteruimte", booker: "Manon", week: DemoWeek.Next, day: 3, from: "10:00", to: "10:30", summary: "Stilteruimte - Manon", editable: false },
  { room: "Stilteruimte", booker: "Dirk", week: DemoWeek.Next, day: 3, from: "10:30", to: "11:00", summary: "Stilteruimte - Dirk", editable: false },
  { room: "Vergaderruimte C3", booker: "Sanne", week: DemoWeek.Next, day: 3, from: "10:00", to: "11:30", summary: "Vergaderruimte C3 - Sanne", editable: false },
  { room: "Vergaderruimte C3", booker: "Griet", week: DemoWeek.Next, day: 3, from: "11:00", to: "12:00", summary: "Vergaderruimte C3 - Griet", editable: false },
  { room: "Unknown", booker: "Fatima", week: DemoWeek.Next, day: 3, from: "09:00", to: "10:00", summary: "Werkplaats overleg - Fatima", editable: false },
  { room: "Unknown", booker: "Ozan", week: DemoWeek.Next, day: 3, from: "10:00", to: "11:00", summary: "Werkplaats overleg - Ozan", editable: false },
  { room: "Kletshok 03", booker: "Bèr", week: DemoWeek.Next, day: 4, from: "10:00", to: "12:00", summary: "Kletshok 03 - Bèr", editable: true },
  { room: "Kletshok 04", booker: "Willem", week: DemoWeek.Next, day: 4, from: "11:00", to: "12:00", summary: "Kletshok 04 - Willem", editable: false },
  { room: "Kletshok 04", booker: "Anneke", week: DemoWeek.Next, day: 4, from: "12:00", to: "13:00", summary: "Kletshok 04 - Anneke", editable: false },
  { room: "Stilteruimte", booker: "Manon", week: DemoWeek.Next, day: 4, from: "10:00", to: "11:30", summary: "Stilteruimte - Manon", editable: false },
  { room: "Stilteruimte", booker: "Dirk", week: DemoWeek.Next, day: 4, from: "11:00", to: "12:00", summary: "Stilteruimte - Dirk", editable: false },
  { room: "Tuinkamer", booker: "Sanne", week: DemoWeek.Next, day: 4, from: "11:00", to: "13:00", summary: "Tuinkamer - Sanne", editable: false },
  { room: "Vergaderruimte C3", booker: "Griet", week: DemoWeek.Next, day: 4, from: "09:00", to: "10:00", summary: "Vergaderruimte C3 - Griet", editable: false },
  { room: "Vergaderruimte C3", booker: "Fatima", week: DemoWeek.Next, day: 4, from: "10:00", to: "11:00", summary: "Vergaderruimte C3 - Fatima", editable: false },
  { room: "Unknown", booker: "Ozan", week: DemoWeek.Next, day: 4, from: "10:00", to: "11:00", summary: "Werkplaats overleg - Ozan", editable: false },
  { room: "Unknown", booker: "Jorien", week: DemoWeek.Next, day: 4, from: "11:00", to: "11:30", summary: "Werkplaats overleg - Jorien", editable: false },
  { room: "Unknown", booker: "Willem", week: DemoWeek.Next, day: 4, from: "11:30", to: "12:00", summary: "Werkplaats overleg - Willem", editable: false },
];

/**
 * Demo calendar adapter
 *
 * Serves the hardcoded demo bookings of the previous, current and next
 * week for the given profile, using the real rooms from rooms.ts. The
 * bookings marked editable are the profile user's; all others are
 * read-only. Never touches the network or Google Calendar.
 */
export class DemoCalendarAdapter implements CalendarServicePort {
  private bookings: Booking[];

  /**
   * Create a new demo calendar adapter
   *
   * @param profile - The user the demo calendar is served for; the
   *                  bookings marked editable are theirs
   */
  constructor(profile: AuthenticatedUser) {
    this.bookings = this.demoBookings(profile);
  }

  /**
   * Get all rooms with their demo bookings for the requested week
   *
   * @param week - The week range to serve bookings from (default:
   *               current week)
   * @returns Promise resolving to array of rooms with their bookings
   */
  getRoomsWithBookings(week: WeekRange = getThisWeek()): Promise<Room[]> {
    return Promise.resolve(this.buildRooms(week));
  }

  /**
   * Build the rooms with the demo bookings that fall in the given week
   */
  private buildRooms(week: WeekRange): Room[] {
    return ROOMS.map((room) => ({
      canonicalName: room.canonicalName,
      shortName: room.shortName,
      bookings: this.bookings.filter((booking) =>
        booking.room === room.canonicalName &&
        booking.start < week.end && booking.end > week.start
      ),
    }));
  }

  /**
   * The hardcoded demo bookings in one go: each booking is placed in
   * its demo week relative to the current week, and the bookings
   * marked editable get the profile as their booker
   */
  private demoBookings(profile: AuthenticatedUser): Booking[] {
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));

    return DEMO_BOOKINGS.map((demo, position) => {
      const booker = demo.editable ? profile.name : demo.booker;
      const author = demo.editable
        ? profile.email
        : `${demo.booker.toLowerCase()}@example.com`;
      const summary = demo.editable
        ? demo.summary.replace(demo.booker, profile.name)
        : demo.summary;

      const booking: Booking = {
        id: `demo-${position}`,
        uid: `demo-${position}@boekjehokje.invalid`,
        summary,
        room: demo.room,
        booker,
        editable: demo.editable,
        details: {
          originalName: summary,
          author,
        },
        start: this.demoDate(monday, demo.week, demo.day, demo.from),
        end: this.demoDate(monday, demo.week, demo.day, demo.to),
      };
      return booking;
    });
  }

  /**
   * The date and time of a hardcoded booking, placed in its demo week
   * and weekday relative to the given Monday
   */
  private demoDate(
    monday: Date,
    week: DemoWeek,
    day: number,
    time: string,
  ): Date {
    const [hour, minute] = time.split(":").map(Number);
    const date = new Date(monday);
    date.setDate(monday.getDate() + WEEK_OFFSET_DAYS[week] + day);
    date.setHours(hour, minute, 0, 0);
    return date;
  }
}
