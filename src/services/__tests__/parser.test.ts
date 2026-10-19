/**
 * Unit tests for room parser
 *
 * Tests the internal parsing functions directly.
 * These tests import specific functions from parser.ts that aren't
 * necessarily exported from the public API.
 */

// Import internal functions for testing
import {
  CANONICAL_ROOMS,
  extractBooker,
  extractRoom,
  isPersonName,
  normalizeRoomName,
  parseAndGroupEvents,
  parseEvent,
  ROOMS,
  UNKNOWN_ROOM,
} from "../parser.ts";
import { Room } from "../rooms.ts";
import type { CalendarEvent } from "../../utils/types.ts";
import type { Booking } from "../CalendarService.ts";

import { assert, assertEquals } from "@std/assert";

Deno.test.each(
  [
    // Exact canonical names
    {
      input: "Kletshok 05",
      expected: "Kletshok 05",
    },
    // Aliases with different formats
    {
      input: "05 Kletshok",
      expected: "Kletshok 05",
    },
    {
      input: "05",
      expected: "Kletshok 05",
    },
    {
      input: "5",
      expected: "Kletshok 05",
    },
    {
      input: "kh5",
      expected: "Kletshok 05",
    },
    {
      input: "kletshok5",
      expected: "Kletshok 05",
    },
    {
      input: "KH 05",
      expected: "Kletshok 05",
    },
    {
      input: "Kletskubus 05",
      expected: "Kletshok 05",
    },
    {
      input: "stilteruimte",
      expected: "Stilteruimte",
    },
    {
      input: "02 stilte ruimte",
      expected: "Stilteruimte",
    },
    {
      input: "tuin kamer",
      expected: "Tuinkamer",
    },
    {
      input: "Klets Hok 03",
      expected: "Kletshok 03",
    },
    {
      input: "vergaderruimte c3",
      expected: "Vergaderruimte C3",
    },
    // Unknown: "c3" alone does not name the Vergaderruimte
    {
      input: "c3",
      expected: UNKNOWN_ROOM,
    },
    // Unknown
    {
      input: "Some Unknown Room",
      expected: UNKNOWN_ROOM,
    },
    {
      input: "",
      expected: UNKNOWN_ROOM,
    },
  ],
)("normalizeRoomName($input) == $expected", ({ input, expected }) => {
  const output = normalizeRoomName(input);
  assertEquals(output, expected);
});

Deno.test.each(
  [
    {
      input: "05 kletshok - Peter",
      expected: "Kletshok 05",
    },
    {
      input: "04 Kletshok | Vincent unit 59",
      expected: "Kletshok 04",
    },
    {
      input: "05 kletshok Peter",
      expected: "Kletshok 05",
    },
    {
      input: "Vergaderruimte C3 TABULA RASA",
      expected: UNKNOWN_ROOM, // TODO: Handle this case - needs separator or better extraction
    },
    {
      input: "06 Tuinkamer",
      expected: "Tuinkamer",
    },
    {
      input: "Kletskubus 4",
      expected: "Kletshok 04",
    },
    {
      input: "04 kletshok| klets kevin",
      expected: "Kletshok 04",
    },
    {
      input: "02 stilte ruimte| studio s",
      expected: "Stilteruimte",
    },
    {
      input: "Team Meeting",
      expected: UNKNOWN_ROOM,
    },
  ],
)("extractRoom($input) -> $expected", ({ input, expected }) => {
  const result = extractRoom(input);
  assertEquals(result, expected);
});

Deno.test.each(
  [
    {
      name: "Dash separator: 05 kletshok - Peter",
      input: "05 kletshok - Peter",
      expected: "Peter",
    },
    {
      name: "Pipe separator: 04 Kletshok | Vincent unit 59",
      input: "04 Kletshok | Vincent unit 59",
      expected: "Vincent",
    },
    {
      name: "Simple: 05 kletshok - Peter",
      input: "05 kletshok - Peter",
      expected: "Peter",
    },
    {
      name: "Pipe separator duplicate: 04 Kletshok | Vincent unit 59",
      input: "04 Kletshok | Vincent unit 59",
      expected: "Vincent",
    },
  ],
)("extractBooker($input) -> $expected", ({ input, expected }) => {
  const result = extractBooker(input);
  assertEquals(result, expected);
});

Deno.test("parseEvent", () => {
  const mockEvent: CalendarEvent = {
    id: "test-id",
    uid: "test-uid",
    summary: "05 kletshok - Peter",
    creator: { email: "peter@example.com" },
    start: { dateTime: "2026-10-06T10:00:00Z" },
    end: { dateTime: "2026-10-06T11:00:00Z" },
    created: "2026-10-05T09:00:00Z",
    updated: "2026-10-05T09:00:00Z",
    status: "confirmed",
    sequence: 0,
  };

  const result = parseEvent(mockEvent);

  assertEquals(result.id, "test-id", "Event ID should match");
  assertEquals(result.uid, "test-uid", "Event UID should match");
  assertEquals(result.summary, "05 kletshok - Peter", "Summary should match");
  assertEquals(result.room, "Kletshok 05", "Room should be normalized");
  assertEquals(result.booker, "Peter", "Booker should be extracted");
  assertEquals(result.status, "confirmed", "Status should match");
  assertEquals(result.sequence, 0, "Sequence should match");

  // Check dates
  assert(
    result.start.getTime() === new Date("2026-10-06T10:00:00Z").getTime(),
    "Start date should match",
  );
  assert(
    result.end.getTime() === new Date("2026-10-06T11:00:00Z").getTime(),
    "End date should match",
  );
  assert(
    result.created.getTime() === new Date("2026-10-05T09:00:00Z").getTime(),
    "Created date should match",
  );
});

Deno.test.each(
  [
    {
      name: "Valid: Peter",
      input: "Peter",
      expected: true,
    },
    {
      name: "Valid: Vincent van Gogh",
      input: "Vincent van Gogh",
      expected: true,
    },
    {
      name: "Invalid: unit",
      input: "unit",
      expected: false,
    },
    {
      name: "Invalid: 05",
      input: "05",
      expected: false,
    },
    {
      name: "Invalid: kletshok",
      input: "kletshok",
      expected: false,
    },
    {
      name: "Invalid: empty",
      input: "",
      expected: false,
    },
    {
      name: "Invalid: unit 59",
      input: "unit 59",
      expected: false,
    },
  ],
)("isPersonName($input) -> $expected", ({ input, expected }) => {
  const output = isPersonName(input);
  assertEquals(output, expected);
});

// Test Room class
Deno.test("Room class has correct structure", () => {
  const room = new Room("Test Room", "TR", ["test", "room"]);

  assertEquals(room.canonicalName, "Test Room");
  assertEquals(room.shortName, "TR");
  assertEquals(room.aliases, ["test", "room"]);
  assertEquals(room.bookings, []);
});

Deno.test("Room class can have bookings set", () => {
  const room = new Room("Test Room", "TR", ["test", "room"]);

  const booking: Booking = {
    id: "booking-1",
    uid: "booking-uid-1",
    summary: "Test booking",
    room: "Test Room",
    booker: "Peter",
    start: new Date("2026-10-13T10:00:00Z"),
    end: new Date("2026-10-13T11:00:00Z"),
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  room.bookings = [booking];

  assertEquals(room.bookings.length, 1);
  assertEquals(room.bookings[0].id, "booking-1");
});

Deno.test("Room class addBooking method works", () => {
  const room = new Room("Test Room", "TR", ["test", "room"]);

  const booking: Booking = {
    id: "booking-1",
    uid: "booking-uid-1",
    summary: "Test booking",
    room: "Test Room",
    booker: "Peter",
    start: new Date("2026-10-13T10:00:00Z"),
    end: new Date("2026-10-13T11:00:00Z"),
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  room.addBooking(booking);

  assertEquals(room.bookings.length, 1);
  assertEquals(room.bookings[0].id, "booking-1");
});

Deno.test("Room class todayBookings filters correctly", () => {
  const room = new Room("Test Room", "TR", ["test", "room"]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Booking for today
  const todayBooking: Booking = {
    id: "booking-today",
    uid: "booking-uid-today",
    summary: "Today booking",
    room: "Test Room",
    booker: "Peter",
    start: new Date(today),
    end: new Date(today.getTime() + 3600000), // 1 hour later
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  // Booking for tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowBooking: Booking = {
    id: "booking-tomorrow",
    uid: "booking-uid-tomorrow",
    summary: "Tomorrow booking",
    room: "Test Room",
    booker: "Paul",
    start: new Date(tomorrow),
    end: new Date(tomorrow.getTime() + 3600000),
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  room.bookings = [todayBooking, tomorrowBooking];

  const todayBookings = room.todayBookings();

  assertEquals(todayBookings.length, 1);
  assertEquals(todayBookings[0].id, "booking-today");
});

Deno.test("Room class matchesIdentifier works", () => {
  const room = new Room("Kletshok 03", "KH 03", ["kletshok 03", "03", "kh3"]);

  assert(room.matchesIdentifier("Kletshok 03"));
  assert(room.matchesIdentifier("kletshok 03"));
  assert(room.matchesIdentifier("KH 03"));
  assert(room.matchesIdentifier("kh 03"));
  assert(room.matchesIdentifier("03"));
  assert(!room.matchesIdentifier("Kletshok 04"));
});

// Test new Room class filtering methods
Deno.test("Room class previousBookings filters correctly", () => {
  const room = new Room("Test Room", "TR", ["test", "room"]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Booking for yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayBooking: Booking = {
    id: "booking-yesterday",
    uid: "booking-uid-yesterday",
    summary: "Yesterday booking",
    room: "Test Room",
    booker: "Peter",
    start: new Date(yesterday),
    end: new Date(yesterday.getTime() + 3600000),
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  // Booking for today
  const todayBooking: Booking = {
    id: "booking-today",
    uid: "booking-uid-today",
    summary: "Today booking",
    room: "Test Room",
    booker: "Peter",
    start: new Date(today),
    end: new Date(today.getTime() + 3600000),
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  // Booking for tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowBooking: Booking = {
    id: "booking-tomorrow",
    uid: "booking-uid-tomorrow",
    summary: "Tomorrow booking",
    room: "Test Room",
    booker: "Paul",
    start: new Date(tomorrow),
    end: new Date(tomorrow.getTime() + 3600000),
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  room.bookings = [yesterdayBooking, todayBooking, tomorrowBooking];

  const previousBookings = room.previousBookings();

  assertEquals(previousBookings.length, 1);
  assertEquals(previousBookings[0].id, "booking-yesterday");
});

Deno.test("Room class futureBookings filters correctly", () => {
  const room = new Room("Test Room", "TR", ["test", "room"]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Booking for yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayBooking: Booking = {
    id: "booking-yesterday",
    uid: "booking-uid-yesterday",
    summary: "Yesterday booking",
    room: "Test Room",
    booker: "Peter",
    start: new Date(yesterday),
    end: new Date(yesterday.getTime() + 3600000),
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  // Booking for today
  const todayBooking: Booking = {
    id: "booking-today",
    uid: "booking-uid-today",
    summary: "Today booking",
    room: "Test Room",
    booker: "Peter",
    start: new Date(today),
    end: new Date(today.getTime() + 3600000),
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  // Booking for tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowBooking: Booking = {
    id: "booking-tomorrow",
    uid: "booking-uid-tomorrow",
    summary: "Tomorrow booking",
    room: "Test Room",
    booker: "Paul",
    start: new Date(tomorrow),
    end: new Date(tomorrow.getTime() + 3600000),
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  room.bookings = [yesterdayBooking, todayBooking, tomorrowBooking];

  const futureBookings = room.futureBookings();

  assertEquals(futureBookings.length, 1);
  assertEquals(futureBookings[0].id, "booking-tomorrow");
});

Deno.test("Room class nextDaysBookings returns future bookings", () => {
  const room = new Room("Test Room", "TR", ["test", "room"]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Booking for today
  const todayBooking: Booking = {
    id: "booking-today",
    uid: "booking-uid-today",
    summary: "Today booking",
    room: "Test Room",
    booker: "Peter",
    start: new Date(today),
    end: new Date(today.getTime() + 3600000),
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  // Booking for tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowBooking: Booking = {
    id: "booking-tomorrow",
    uid: "booking-uid-tomorrow",
    summary: "Tomorrow booking",
    room: "Test Room",
    booker: "Paul",
    start: new Date(tomorrow),
    end: new Date(tomorrow.getTime() + 3600000),
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  // Booking for day after tomorrow
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  const dayAfterBooking: Booking = {
    id: "booking-day-after",
    uid: "booking-uid-day-after",
    summary: "Day after booking",
    room: "Test Room",
    booker: "Mary",
    start: new Date(dayAfterTomorrow),
    end: new Date(dayAfterTomorrow.getTime() + 3600000),
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  room.bookings = [todayBooking, tomorrowBooking, dayAfterBooking];

  const nextDaysBookings = room.nextDaysBookings();

  assertEquals(nextDaysBookings.length, 2);
  assertEquals(nextDaysBookings[0].id, "booking-tomorrow");
  assertEquals(nextDaysBookings[1].id, "booking-day-after");
});

Deno.test("Room class helper methods work correctly", () => {
  const room = new Room("Test Room", "TR", ["test", "room"]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Booking for yesterday
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Booking for today
  const todayBooking: Booking = {
    id: "booking-today",
    uid: "booking-uid-today",
    summary: "Today booking",
    room: "Test Room",
    booker: "Peter",
    start: new Date(today),
    end: new Date(today.getTime() + 3600000),
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  // Booking for tomorrow
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowBooking: Booking = {
    id: "booking-tomorrow",
    uid: "booking-uid-tomorrow",
    summary: "Tomorrow booking",
    room: "Test Room",
    booker: "Paul",
    start: new Date(tomorrow),
    end: new Date(tomorrow.getTime() + 3600000),
    details: { originalName: "Testboeking", author: "test@example.com" },
  };

  room.bookings = [todayBooking, tomorrowBooking];

  assert(room.hasTodayBookings());
  assert(!room.hasPreviousBookings());
  assert(room.hasFutureBookings());
  assertEquals(room.nextDaysCount(), 1);
});

// Test Room objects structure
Deno.test("Workshopruimte is no longer a known room", () => {
  assert(
    !Array.from(CANONICAL_ROOMS).includes("Workshopruimte C3"),
    "Workshopruimte C3 should not be a canonical room",
  );
  assert(
    !ROOMS.some((room) => room.matchesIdentifier("workshop c3")),
    "No room should match the workshop identifiers",
  );
  assertEquals(normalizeRoomName("workshop c3"), UNKNOWN_ROOM);
  assertEquals(normalizeRoomName("workshopruimte c3"), UNKNOWN_ROOM);
});

Deno.test("parseAndGroupEvents ignores events on the ignore list", () => {
  const blockingEvent: CalendarEvent = {
    id: "blocking-1",
    uid: "blocking-uid-1",
    summary: "C3 workshopruimte Team NYMA makersplaats",
    creator: { email: "team@example.com" },
    start: { dateTime: "2026-10-06T09:00:00Z" },
    end: { dateTime: "2026-10-06T17:00:00Z" },
    created: "2026-10-01T09:00:00Z",
    updated: "2026-10-01T09:00:00Z",
    status: "confirmed",
    sequence: 0,
  };

  const normalEvent: CalendarEvent = {
    id: "event-1",
    uid: "uid-1",
    summary: "05 kletshok - Peter",
    creator: { email: "peter@example.com" },
    start: { dateTime: "2026-10-06T10:00:00Z" },
    end: { dateTime: "2026-10-06T11:00:00Z" },
    created: "2026-10-05T09:00:00Z",
    updated: "2026-10-05T09:00:00Z",
    status: "confirmed",
    sequence: 0,
  };

  const result = parseAndGroupEvents([blockingEvent, normalEvent]);

  assertEquals(result.length, 1, "Only the normal event should remain");
  assertEquals(result[0].room.canonicalName, "Kletshok 05");
  assertEquals(result[0].bookings.length, 1);
  assertEquals(result[0].bookings[0].id, "event-1");
});

Deno.test("Room objects have correct structure", () => {
  assert(ROOMS.length > 0, "Should have at least one room");

  for (const room of ROOMS) {
    assert(
      "canonicalName" in room && typeof room.canonicalName === "string",
      "Room should have canonicalName string",
    );
    assert(
      "shortName" in room && typeof room.shortName === "string",
      "Room should have shortName string",
    );
    assert(
      "aliases" in room && Array.isArray(room.aliases),
      "Room should have aliases array",
    );

    // All aliases should be strings
    for (const alias of room.aliases) {
      assert(typeof alias === "string", "All aliases should be strings");
    }
  }
});

Deno.test("CANONICAL_ROOMS contains all canonical names", () => {
  // CANONICAL_ROOMS excludes the Unknown room, so we filter it out
  const expectedCanonicalNames = ROOMS
    .filter((room) => room.canonicalName !== UNKNOWN_ROOM)
    .map((room) => room.canonicalName);
  assertEquals(
    Array.from(CANONICAL_ROOMS),
    expectedCanonicalNames,
    "CANONICAL_ROOMS should match all room canonical names (excluding Unknown)",
  );
});

Deno.test("UNKNOWN_ROOM_INSTANCE is included in ROOMS", () => {
  const unknownRoom = ROOMS.find((room) => room.canonicalName === UNKNOWN_ROOM);
  assert(unknownRoom !== undefined, "UNKNOWN_ROOM_INSTANCE should be in ROOMS");
  assertEquals(unknownRoom?.canonicalName, UNKNOWN_ROOM);
});
