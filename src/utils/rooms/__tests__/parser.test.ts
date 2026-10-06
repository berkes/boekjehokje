/**
 * Unit tests for room parser
 *
 * Tests the internal parsing functions directly.
 * These tests import specific functions from parser.ts that aren't
 * necessarily exported from the public index.ts API.
 */

// Import internal functions for testing
// These are not exported from the public API, but we can test them directly
import {
  extractBooker,
  extractRoom,
  isPersonName,
  normalizeRoomName,
  parseEvent,
} from "../parser.ts";
import { UNKNOWN_ROOM } from "../config.ts";
import type { CalendarEvent } from "../../types.ts";

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
      input: "c3",
      expected: "Vergaderruimte C3",
    },
    {
      input: "vergaderruimte c3",
      expected: "Vergaderruimte C3",
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
      expected: "Tuinkamer 06",
    },
    {
      input: "Kletskubus 4",
      expected: "Kletshok 04",
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
