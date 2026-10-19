/**
 * Unit tests for the calendar DayPilot translation utilities
 *
 * Verifies the mapping from the domain model (rooms, bookings, plain
 * Dates) to the shapes DayPilot expects.
 */
import { assert, assertEquals } from "@std/assert";
import type { Booking } from "../../../services/index.ts";
import {
  findBooking,
  roomDescription,
  roomLabel,
  toColumns,
  toDayPilotString,
  toEvents,
  withUnknownLast,
} from "../utils.tsx";

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: "id-1",
    uid: "uid-1",
    summary: "Summary",
    room: "Kletshok 05",
    booker: null,
    details: {
      originalName: "Kletshok 05",
      author: "booker@example.com",
    },
    start: new Date(2026, 1, 19, 10, 0, 0),
    end: new Date(2026, 1, 19, 11, 0, 0),
    ...overrides,
  };
}

Deno.test("toDayPilotString formats a Date as local time without timezone suffix", () => {
  assertEquals(
    toDayPilotString(new Date(2026, 1, 19, 9, 5, 7)),
    "2026-02-19T09:05:07",
  );
});

Deno.test("toColumns maps rooms to columns by canonical and short name", () => {
  const columns = toColumns([
    { canonicalName: "Kletshok 05", shortName: "KH05", bookings: [] },
  ]);
  assertEquals(columns, [{
    id: "Kletshok 05",
    name: "KH05",
    toolTip: "Kletshok 05",
  }]);
});

Deno.test("toColumns sorts the unknown room last", () => {
  const columns = toColumns([
    { canonicalName: "Unknown", shortName: "?", bookings: [] },
    { canonicalName: "Kletshok 05", shortName: "KH05", bookings: [] },
  ]);
  assertEquals(columns.map((c) => c.id), ["Kletshok 05", "Unknown"]);
});

Deno.test("withUnknownLast moves the unknown room to the end", () => {
  const rooms = [
    { canonicalName: "Unknown", shortName: "?", bookings: [] },
    { canonicalName: "Kletshok 05", shortName: "KH05", bookings: [] },
  ];
  assertEquals(withUnknownLast(rooms).map((r) => r.canonicalName), [
    "Kletshok 05",
    "Unknown",
  ]);
});

Deno.test("withUnknownLast keeps the order of the known rooms", () => {
  const rooms = [
    { canonicalName: "Tuinkamer", shortName: "TK", bookings: [] },
    { canonicalName: "Kletshok 05", shortName: "KH05", bookings: [] },
  ];
  assertEquals(withUnknownLast(rooms).map((r) => r.canonicalName), [
    "Tuinkamer",
    "Kletshok 05",
  ]);
});

Deno.test("withUnknownLast does not change the input rooms", () => {
  const rooms = [
    { canonicalName: "Unknown", shortName: "?", bookings: [] },
    { canonicalName: "Kletshok 05", shortName: "KH05", bookings: [] },
  ];
  withUnknownLast(rooms);
  assertEquals(rooms.map((r) => r.canonicalName), [
    "Unknown",
    "Kletshok 05",
  ]);
});

Deno.test("toEvents maps bookings to events on the room's resource", () => {
  const events = toEvents([
    {
      canonicalName: "Kletshok 05",
      shortName: "KH05",
      bookings: [
        booking({ booker: "Alice", summary: "Overleg" }),
      ],
    },
  ]);
  assertEquals(events, [{
    id: "id-1",
    text: "Alice",
    start: "2026-02-19T10:00:00",
    end: "2026-02-19T11:00:00",
    resource: "Kletshok 05",
    toolTip: "Overleg",
  }]);
});

Deno.test("toEvents falls back to the summary when there is no booker", () => {
  const events = toEvents([
    {
      canonicalName: "Kletshok 05",
      shortName: "KH05",
      bookings: [booking({ booker: null, summary: "Overleg" })],
    },
  ]);
  assertEquals(events[0].text, "Overleg");
});

Deno.test("findBooking finds a booking by id across rooms", () => {
  const alice = booking({ id: "id-1", booker: "Alice" });
  const bob = booking({ id: "id-2", booker: "Bob" });
  const found = findBooking(
    [
      { canonicalName: "Kletshok 05", shortName: "KH05", bookings: [alice] },
      { canonicalName: "Kletshok 04", shortName: "KH04", bookings: [bob] },
    ],
    "id-2",
  );
  assertEquals(found, bob);
});

Deno.test("findBooking returns null for an unknown id", () => {
  assertEquals(
    findBooking(
      [{ canonicalName: "Kletshok 05", shortName: "KH05", bookings: [] }],
      "missing",
    ),
    null,
  );
});

Deno.test("roomDescription explains the unknown room", () => {
  const description = roomDescription({ canonicalName: "Unknown" });
  assert(description.length > 0);
});

Deno.test("roomDescription uses the canonical name for known rooms", () => {
  assertEquals(
    roomDescription({ canonicalName: "Kletshok 05" }),
    "Kletshok 05",
  );
});

Deno.test("roomLabel uses the full canonical name for known rooms", () => {
  assertEquals(
    roomLabel({ canonicalName: "Kletshok 05", shortName: "KH 05" }),
    "Kletshok 05",
  );
});

Deno.test("roomLabel uses the short name for the unknown room", () => {
  assertEquals(
    roomLabel({ canonicalName: "Unknown", shortName: "Unknown" }),
    "Unknown",
  );
});
