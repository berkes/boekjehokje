/**
 * Unit tests for room parser
 *
 * Tests the internal parsing functions directly.
 * These tests import specific functions from parser.ts that aren't
 * necessarily exported from the public API.
 */

// Import internal functions for testing
import {
  extractBooker,
  extractRoom,
  isIgnoredEvent,
  isPersonName,
  normalizeRoomName,
  parseAndGroupEvents,
  parseEvent,
} from "../parser.ts";
import { CANONICAL_ROOMS, ROOMS, UNKNOWN_ROOM } from "../rooms.ts";
import type { CalendarEvent } from "../../utils/types.ts";

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
      input: "kletshok 3",
      expected: "Kletshok 03",
    },
    {
      input: "Kletshok 4",
      expected: "Kletshok 04",
    },
    {
      input: "kletshok 5",
      expected: "Kletshok 05",
    },
    {
      input: "3 kletshok",
      expected: "Kletshok 03",
    },
    {
      input: "4 kletshok",
      expected: "Kletshok 04",
    },
    {
      input: "5 kletshok",
      expected: "Kletshok 05",
    },
    {
      input: "kh 3",
      expected: "Kletshok 03",
    },
    {
      input: "KH 4",
      expected: "Kletshok 04",
    },
    {
      input: "KH 5",
      expected: "Kletshok 05",
    },
    {
      input: "kletshok03",
      expected: "Kletshok 03",
    },
    {
      input: "kletshok4",
      expected: "Kletshok 04",
    },
    {
      input: "2 stilteruimte",
      expected: "Stilteruimte",
    },
    {
      input: "02 stilteruimte",
      expected: "Stilteruimte",
    },
    {
      input: "stilte ruimte 2",
      expected: "Stilteruimte",
    },
    {
      input: "2 stilte ruimte",
      expected: "Stilteruimte",
    },
    {
      input: "tuinkamer 6",
      expected: "Tuinkamer",
    },
    {
      input: "6 tuinkamer",
      expected: "Tuinkamer",
    },
    {
      input: "tuin kamer 6",
      expected: "Tuinkamer",
    },
    {
      input: "tuin kamer 06",
      expected: "Tuinkamer",
    },
    {
      input: "vergaderruimte c3",
      expected: "Vergaderruimte C3",
    },
    {
      input: "c3 vergaderruimte",
      expected: "Vergaderruimte C3",
    },
    {
      input: "c3 vergader",
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
      input: "Kletskubus 4",
      expected: "Kletshok 04",
    },
    {
      input: "Kletshok 3 - Anna",
      expected: "Kletshok 03",
    },
    {
      input: "Vergaderruimte C3 TABULA RASA",
      expected: "Vergaderruimte C3",
    },
    {
      input: "C3 vergaderruimte TABULA",
      expected: "Vergaderruimte C3",
    },
    {
      input: "C3 Vergaderruimte / Club Goud",
      expected: "Vergaderruimte C3",
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
    {
      name: "Room prefix without separator: C3 vergaderruimte TABULA",
      input: "C3 vergaderruimte TABULA",
      expected: "TABULA",
    },
    {
      name: "Slash separator: C3 Vergaderruimte / Club Goud",
      input: "C3 Vergaderruimte / Club Goud",
      expected: "Club Goud",
    },
  ],
)("extractBooker($input) -> $expected", ({ input, expected }) => {
  const result = extractBooker(input);
  assertEquals(result, expected);
});

Deno.test.each(
  [
    {
      input: "C3 workshopruimte Team NYMA makersplaats",
      expected: true,
    },
    {
      input: "Inloopuurtje huurders",
      expected: true,
    },
    {
      input: "  Inloopuurtje huurders  ",
      expected: true,
    },
    {
      input: "bakwagen",
      expected: true,
    },
    {
      input: "De Bakwagen",
      expected: true,
    },
    {
      input: "BAKWAGEN bezet",
      expected: true,
    },
    {
      input: "05 kletshok - Peter",
      expected: false,
    },
    {
      input: "Inloopuurtje",
      expected: false,
    },
  ],
)("isIgnoredEvent($input) -> $expected", ({ input, expected }) => {
  const result = isIgnoredEvent(input);
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

Deno.test("Workshopruimte is no longer a known room", () => {
  assert(
    !Array.from(CANONICAL_ROOMS).includes("Workshopruimte C3"),
    "Workshopruimte C3 should not be a canonical room",
  );
  assert(
    !ROOMS.some((room) => room.canonicalName === "Workshopruimte C3"),
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

Deno.test("parseAndGroupEvents ignores the new ignore list entries", () => {
  const ignoredEvents: CalendarEvent[] = [
    {
      id: "inloop-1",
      uid: "inloop-uid-1",
      summary: "Inloopuurtje huurders",
      creator: { email: "team@example.com" },
      start: { dateTime: "2026-10-06T09:00:00Z" },
      end: { dateTime: "2026-10-06T17:00:00Z" },
      created: "2026-10-01T09:00:00Z",
      updated: "2026-10-01T09:00:00Z",
      status: "confirmed",
      sequence: 0,
    },
    {
      id: "bakwagen-1",
      uid: "bakwagen-uid-1",
      summary: "Bakwagen C3 bezet",
      creator: { email: "team@example.com" },
      start: { dateTime: "2026-10-06T09:00:00Z" },
      end: { dateTime: "2026-10-06T17:00:00Z" },
      created: "2026-10-01T09:00:00Z",
      updated: "2026-10-01T09:00:00Z",
      status: "confirmed",
      sequence: 0,
    },
  ];

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

  const result = parseAndGroupEvents([...ignoredEvents, normalEvent]);

  assertEquals(result.length, 1, "Only the normal event should remain");
  assertEquals(result[0].room.canonicalName, "Kletshok 05");
  assertEquals(result[0].bookings.length, 1);
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

Deno.test("The Unknown room config is included in ROOMS", () => {
  const unknownRoom = ROOMS.find((room) => room.canonicalName === UNKNOWN_ROOM);
  assert(unknownRoom !== undefined, "The Unknown room should be in ROOMS");
  assertEquals(unknownRoom?.canonicalName, UNKNOWN_ROOM);
});
