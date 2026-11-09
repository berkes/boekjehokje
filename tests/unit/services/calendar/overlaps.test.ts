/**
 * Unit tests for the overlap detection (issue #16)
 *
 * Tests the public interface of overlaps.ts with plain Date values:
 * findOverlaps finds the existing bookings of a room that a candidate
 * time range overlaps, so the booking form can warn about double
 * bookings before confirming (the user stays free to book anyway).
 */
import { assertEquals } from "@std/assert";
import type { Booking } from "../../../../src/services/calendar/CalendarServicePort.ts";
import {
  findOverlaps,
  rangesOverlap,
} from "../../../../src/services/calendar/overlaps.ts";

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: "id-1",
    uid: "uid-1",
    summary: "KH 03 | Willem",
    htmlLink: null,
    room: "Kletshok 03",
    booker: "Willem",
    editable: false,
    details: {
      originalName: "KH 03 | Willem",
      author: "willem@example.com",
    },
    start: new Date(2026, 9, 28, 11, 0, 0),
    end: new Date(2026, 9, 28, 13, 0, 0),
    ...overrides,
  };
}

const ROOMS = [
  {
    canonicalName: "Kletshok 03",
    bookings: [
      booking({ id: "willem", summary: "KH 03 | Willem", booker: "Willem" }),
      booking({
        id: "anneke",
        summary: "KH 03 | Anneke",
        booker: "Anneke",
        start: new Date(2026, 9, 28, 13, 0, 0),
        end: new Date(2026, 9, 28, 14, 0, 0),
      }),
    ],
  },
  {
    canonicalName: "Kletshok 04",
    bookings: [
      booking({
        id: "dirk",
        summary: "KH 04 | Dirk",
        booker: "Dirk",
        room: "Kletshok 04",
        start: new Date(2026, 9, 28, 11, 0, 0),
        end: new Date(2026, 9, 28, 12, 0, 0),
      }),
    ],
  },
];

Deno.test("findOverlaps returns the booking a range overlaps", () => {
  const overlaps = findOverlaps(
    ROOMS,
    "Kletshok 03",
    new Date(2026, 9, 28, 10, 30),
    new Date(2026, 9, 28, 11, 30),
  );
  assertEquals(overlaps.map((b) => b.id), ["willem"]);
});

Deno.test("findOverlaps lists every overlapping booking, sorted by start", () => {
  const overlaps = findOverlaps(
    ROOMS,
    "Kletshok 03",
    new Date(2026, 9, 28, 12, 0),
    new Date(2026, 9, 28, 13, 30),
  );
  assertEquals(overlaps.map((b) => b.id), ["willem", "anneke"]);
});

Deno.test("findOverlaps returns a range fully inside a booking as an overlap", () => {
  const overlaps = findOverlaps(
    ROOMS,
    "Kletshok 03",
    new Date(2026, 9, 28, 11, 30),
    new Date(2026, 9, 28, 12, 30),
  );
  assertEquals(overlaps.map((b) => b.id), ["willem"]);
});

Deno.test("findOverlaps returns a range fully covering bookings as overlaps", () => {
  const overlaps = findOverlaps(
    ROOMS,
    "Kletshok 03",
    new Date(2026, 9, 28, 10, 0),
    new Date(2026, 9, 28, 15, 0),
  );
  assertEquals(overlaps.map((b) => b.id), ["willem", "anneke"]);
});

Deno.test("findOverlaps does not flag a zero-minute gap as an overlap", () => {
  const before = findOverlaps(
    ROOMS,
    "Kletshok 03",
    new Date(2026, 9, 28, 10, 0),
    new Date(2026, 9, 28, 11, 0),
  );
  assertEquals(before, []);

  const after = findOverlaps(
    ROOMS,
    "Kletshok 03",
    new Date(2026, 9, 28, 13, 0),
    new Date(2026, 9, 28, 14, 30),
  );
  assertEquals(after.map((b) => b.id), ["anneke"]);
});

Deno.test("findOverlaps ignores the bookings of other rooms", () => {
  const overlaps = findOverlaps(
    ROOMS,
    "Kletshok 04",
    new Date(2026, 9, 28, 11, 30),
    new Date(2026, 9, 28, 12, 30),
  );
  assertEquals(overlaps.map((b) => b.id), ["dirk"]);
});

Deno.test("findOverlaps returns nothing for an unknown room", () => {
  assertEquals(
    findOverlaps(
      ROOMS,
      "Onbestaande ruimte",
      new Date(2026, 9, 28, 10, 0),
      new Date(2026, 9, 28, 12, 0),
    ),
    [],
  );
});

Deno.test("findOverlaps returns nothing for an inverted or empty range", () => {
  assertEquals(
    findOverlaps(
      ROOMS,
      "Kletshok 03",
      new Date(2026, 9, 28, 12, 0),
      new Date(2026, 9, 28, 11, 0),
    ),
    [],
  );
  assertEquals(
    findOverlaps(
      ROOMS,
      "Kletshok 03",
      new Date(2026, 9, 28, 12, 0),
      new Date(2026, 9, 28, 12, 0),
    ),
    [],
  );
});

Deno.test("findOverlaps does not mutate the rooms or the range", () => {
  const rooms = structuredClone(ROOMS);
  const start = new Date(2026, 9, 28, 10, 30);
  const end = new Date(2026, 9, 28, 11, 30);
  findOverlaps(rooms, "Kletshok 03", start, end);
  assertEquals(rooms, ROOMS);
  assertEquals(start, new Date(2026, 9, 28, 10, 30));
  assertEquals(end, new Date(2026, 9, 28, 11, 30));
});

Deno.test("rangesOverlap is strict at the boundaries", () => {
  const b = {
    start: new Date(2026, 9, 28, 11, 0),
    end: new Date(2026, 9, 28, 13, 0),
  };
  assertEquals(
    rangesOverlap(
      new Date(2026, 9, 28, 10, 0),
      new Date(2026, 9, 28, 11, 0),
      b,
    ),
    false,
  );
  assertEquals(
    rangesOverlap(
      new Date(2026, 9, 28, 13, 0),
      new Date(2026, 9, 28, 14, 0),
      b,
    ),
    false,
  );
  assertEquals(
    rangesOverlap(
      new Date(2026, 9, 28, 12, 0),
      new Date(2026, 9, 28, 14, 0),
      b,
    ),
    true,
  );
});
