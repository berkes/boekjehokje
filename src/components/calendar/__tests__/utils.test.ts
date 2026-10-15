/**
 * Unit tests for the calendar DayPilot translation utilities
 *
 * Verifies the mapping from the domain model (rooms, bookings, plain
 * Dates) to the shapes DayPilot expects.
 */
import { assert, assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import type { Booking } from "../../../services/index.ts";
import {
  roomDescription,
  toColumns,
  toDayPilotString,
  toEvents,
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

describe("toDayPilotString", () => {
  it("formats a Date as local time without timezone suffix", () => {
    assertEquals(
      toDayPilotString(new Date(2026, 1, 19, 9, 5, 7)),
      "2026-02-19T09:05:07",
    );
  });
});

describe("toColumns", () => {
  it("maps rooms to columns by canonical and short name", () => {
    const columns = toColumns([
      { canonicalName: "Kletshok 05", shortName: "KH05", bookings: [] },
    ]);
    assertEquals(columns, [{
      id: "Kletshok 05",
      name: "KH05",
      toolTip: "Kletshok 05",
    }]);
  });

  it("sorts the unknown room last", () => {
    const columns = toColumns([
      { canonicalName: "Unknown", shortName: "?", bookings: [] },
      { canonicalName: "Kletshok 05", shortName: "KH05", bookings: [] },
    ]);
    assertEquals(columns.map((c) => c.id), ["Kletshok 05", "Unknown"]);
  });
});

describe("toEvents", () => {
  it("maps bookings to events on the room's resource", () => {
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

  it("falls back to the summary when there is no booker", () => {
    const events = toEvents([
      {
        canonicalName: "Kletshok 05",
        shortName: "KH05",
        bookings: [booking({ booker: null, summary: "Overleg" })],
      },
    ]);
    assertEquals(events[0].text, "Overleg");
  });
});

describe("roomDescription", () => {
  it("explains the unknown room", () => {
    const description = roomDescription({ canonicalName: "Unknown" });
    assert(description.length > 0);
  });

  it("uses the canonical name for known rooms", () => {
    assertEquals(
      roomDescription({ canonicalName: "Kletshok 05" }),
      "Kletshok 05",
    );
  });
});
