/**
 * Unit tests for bookingCalendarLink
 *
 * The booking's link to its event in the Google Calendar web UI: the
 * event's htmlLink when the calendar API provided one, otherwise the
 * day view of the booking's start date.
 */
import { assertEquals } from "@std/assert";
import type { Booking } from "../../../../src/services/index.ts";
import { bookingCalendarLink } from "../../../../src/components/calendar/bookingLink.ts";

/**
 * A minimal booking with the given htmlLink and start date
 */
function bookingWith(
  htmlLink: string | null,
  start: Date,
): Booking {
  return {
    id: "event-1",
    uid: "uid-1",
    summary: "Kletshok 03 - Bèr",
    htmlLink,
    room: "Kletshok 03",
    booker: "Bèr",
    editable: false,
    details: { originalName: "Kletshok 03 - Bèr", author: "ber@example.com" },
    start,
    end: new Date(start.getTime() + 60 * 60 * 1000),
  };
}

Deno.test("bookingCalendarLink uses the event's htmlLink when the API provides one", () => {
  const booking = bookingWith(
    "https://calendar.google.com/calendar/event?eid=abc123",
    new Date(2026, 10, 12, 10, 0),
  );

  assertEquals(
    bookingCalendarLink(booking),
    "https://calendar.google.com/calendar/event?eid=abc123",
  );
});

Deno.test("bookingCalendarLink falls back to the day view of the start date", () => {
  const booking = bookingWith(null, new Date(2026, 10, 12, 10, 0));

  assertEquals(
    bookingCalendarLink(booking),
    "https://calendar.google.com/calendar/u/0/r/day/2026/11/12",
  );
});

Deno.test("bookingCalendarLink day view uses the 1-based month without padding", () => {
  const booking = bookingWith(null, new Date(2026, 2, 5, 9, 30));

  assertEquals(
    bookingCalendarLink(booking),
    "https://calendar.google.com/calendar/u/0/r/day/2026/3/5",
  );
});
