/**
 * Unit tests for the overlaps service (issue #16)
 *
 * Tests the public interface of the overlaps module (OverlapsPort) with
 * plain Date values: findOverlaps finds the existing bookings of a room
 * that a candidate time range overlaps, so the booking form can warn
 * about double bookings before confirming (the user stays free to book
 * anyway).
 */
import { assertEquals } from "@std/assert";
import type { Booking } from "../../../../src/services/calendar/CalendarServicePort.ts";
import { OverlapsService } from "../../../../src/services/overlaps/index.ts";

const service = new OverlapsService();

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: "id-1",
    uid: "uid-1",
    summary: "03 KH | Willem",
    htmlLink: null,
    room: "Kletshok 03",
    booker: "Willem",
    editable: false,
    details: {
      originalName: "03 KH | Willem",
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
      booking({ id: "willem", summary: "03 KH | Willem", booker: "Willem" }),
      booking({
        id: "anneke",
        summary: "03 KH | Anneke",
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
        summary: "04 KH | Dirk",
        booker: "Dirk",
        room: "Kletshok 04",
        start: new Date(2026, 9, 28, 11, 0, 0),
        end: new Date(2026, 9, 28, 12, 0, 0),
      }),
    ],
  },
];

Deno.test("findOverlaps returns the booking a range overlaps", () => {
  const overlaps = service.findOverlaps(
    ROOMS,
    "Kletshok 03",
    new Date(2026, 9, 28, 10, 30),
    new Date(2026, 9, 28, 11, 30),
  );
  assertEquals(overlaps.map((b) => b.id), ["willem"]);
});

Deno.test("findOverlaps lists every overlapping booking, sorted by start", () => {
  const overlaps = service.findOverlaps(
    ROOMS,
    "Kletshok 03",
    new Date(2026, 9, 28, 12, 0),
    new Date(2026, 9, 28, 13, 30),
  );
  assertEquals(overlaps.map((b) => b.id), ["willem", "anneke"]);
});

Deno.test("findOverlaps returns a range fully inside a booking as an overlap", () => {
  const overlaps = service.findOverlaps(
    ROOMS,
    "Kletshok 03",
    new Date(2026, 9, 28, 11, 30),
    new Date(2026, 9, 28, 12, 30),
  );
  assertEquals(overlaps.map((b) => b.id), ["willem"]);
});

Deno.test("findOverlaps returns a range fully covering bookings as overlaps", () => {
  const overlaps = service.findOverlaps(
    ROOMS,
    "Kletshok 03",
    new Date(2026, 9, 28, 10, 0),
    new Date(2026, 9, 28, 15, 0),
  );
  assertEquals(overlaps.map((b) => b.id), ["willem", "anneke"]);
});

Deno.test("findOverlaps does not flag a zero-minute gap as an overlap", () => {
  const before = service.findOverlaps(
    ROOMS,
    "Kletshok 03",
    new Date(2026, 9, 28, 10, 0),
    new Date(2026, 9, 28, 11, 0),
  );
  assertEquals(before, []);

  const after = service.findOverlaps(
    ROOMS,
    "Kletshok 03",
    new Date(2026, 9, 28, 13, 0),
    new Date(2026, 9, 28, 14, 30),
  );
  assertEquals(after.map((b) => b.id), ["anneke"]);
});

Deno.test("findOverlaps ignores the bookings of other rooms", () => {
  const overlaps = service.findOverlaps(
    ROOMS,
    "Kletshok 04",
    new Date(2026, 9, 28, 11, 30),
    new Date(2026, 9, 28, 12, 30),
  );
  assertEquals(overlaps.map((b) => b.id), ["dirk"]);
});

Deno.test("findOverlaps returns nothing for an unknown room", () => {
  assertEquals(
    service.findOverlaps(
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
    service.findOverlaps(
      ROOMS,
      "Kletshok 03",
      new Date(2026, 9, 28, 12, 0),
      new Date(2026, 9, 28, 11, 0),
    ),
    [],
  );
  assertEquals(
    service.findOverlaps(
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
  service.findOverlaps(rooms, "Kletshok 03", start, end);
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
    service.rangesOverlap(
      new Date(2026, 9, 28, 10, 0),
      new Date(2026, 9, 28, 11, 0),
      b,
    ),
    false,
  );
  assertEquals(
    service.rangesOverlap(
      new Date(2026, 9, 28, 13, 0),
      new Date(2026, 9, 28, 14, 0),
      b,
    ),
    false,
  );
  assertEquals(
    service.rangesOverlap(
      new Date(2026, 9, 28, 12, 0),
      new Date(2026, 9, 28, 14, 0),
      b,
    ),
    true,
  );
});
