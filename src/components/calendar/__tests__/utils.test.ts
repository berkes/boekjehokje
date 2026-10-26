/**
 * Unit tests for the calendar super-calendar translation utilities
 *
 * Verifies the mapping from the domain model (rooms, bookings, plain
 * Dates) to the shapes @super-calendar/dom expects: resource lanes,
 * board events and dom theme tokens.
 */
import { assert, assertEquals } from "@std/assert";
import type { Booking } from "../../../services/index.ts";
import {
  applyMovedEvents,
  type BoardEvent,
  type CalendarResource,
  EDITABLE_EVENT_BACKGROUND,
  findBooking,
  isCalendarResource,
  READ_ONLY_EVENT_BACKGROUND,
  roomDescription,
  roomLabel,
  toDomTheme,
  toEvents,
  toResources,
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

Deno.test("toResources maps rooms to lanes with short name and description", () => {
  const resources = toResources([
    { canonicalName: "Kletshok 05", shortName: "KH05", bookings: [] },
  ]);
  assertEquals(resources, [{
    id: "Kletshok 05",
    title: "KH05",
    description: "Kletshok 05",
  }]);
});

Deno.test("toResources sorts the unknown room last", () => {
  const resources = toResources([
    { canonicalName: "Unknown", shortName: "?", bookings: [] },
    { canonicalName: "Kletshok 05", shortName: "KH05", bookings: [] },
  ]);
  assertEquals(resources.map((r) => r.id), ["Kletshok 05", "Unknown"]);
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
  const events = toEvents(
    [
      {
        canonicalName: "Kletshok 05",
        shortName: "KH05",
        bookings: [
          booking({ booker: "Alice", summary: "Overleg" }),
        ],
      },
    ],
    { email: "booker@example.com" },
  );
  assertEquals(events.length, 1);
  assertEquals(events[0].title, "Alice");
  assertEquals(events[0].start, new Date(2026, 1, 19, 10, 0, 0));
  assertEquals(events[0].end, new Date(2026, 1, 19, 11, 0, 0));
  assertEquals(events[0].resourceId, "Kletshok 05");
  assertEquals(events[0].booking.summary, "Overleg");
});

Deno.test("toEvents makes own bookings editable and draggable", () => {
  const events = toEvents(
    [
      {
        canonicalName: "Kletshok 05",
        shortName: "KH05",
        bookings: [booking({ booker: "Alice" })],
      },
    ],
    { email: "booker@example.com" },
  );
  assertEquals(events[0].editable, true);
  assertEquals(events[0].draggable, true);
});

Deno.test("toEvents marks bookings of other users as read-only", () => {
  const events = toEvents(
    [
      {
        canonicalName: "Kletshok 05",
        shortName: "KH05",
        bookings: [booking({ booker: "Alice" })],
      },
    ],
    { email: "someone.else@example.com" },
  );
  assertEquals(events[0].editable, false);
  assertEquals(events[0].draggable, false);
});

Deno.test("toEvents marks all bookings read-only without a profile", () => {
  const events = toEvents([
    {
      canonicalName: "Kletshok 05",
      shortName: "KH05",
      bookings: [booking({})],
    },
  ]);
  assertEquals(events[0].editable, false);
  assertEquals(events[0].draggable, false);
});

Deno.test("toEvents falls back to the summary when there is no booker", () => {
  const events = toEvents([
    {
      canonicalName: "Kletshok 05",
      shortName: "KH05",
      bookings: [booking({ booker: null, summary: "Overleg" })],
    },
  ]);
  assertEquals(events[0].title, "Overleg");
});

Deno.test("applyMovedEvents overrides time and room of a dragged booking", () => {
  const events = toEvents(
    [
      {
        canonicalName: "Kletshok 05",
        shortName: "KH05",
        bookings: [booking({ id: "id-1" })],
      },
    ],
    { email: "booker@example.com" },
  );
  const moved = applyMovedEvents(
    events,
    new Map([
      ["id-1", {
        start: new Date(2026, 1, 19, 12, 0, 0),
        end: new Date(2026, 1, 19, 13, 0, 0),
        resourceId: "Tuinkamer",
      }],
    ]),
  );
  assertEquals(moved[0].start, new Date(2026, 1, 19, 12, 0, 0));
  assertEquals(moved[0].end, new Date(2026, 1, 19, 13, 0, 0));
  assertEquals(moved[0].resourceId, "Tuinkamer");
  // The original events stay untouched
  assertEquals(events[0].start, new Date(2026, 1, 19, 10, 0, 0));
  assertEquals(events[0].resourceId, "Kletshok 05");
});

Deno.test("applyMovedEvents returns the input when nothing moved", () => {
  const events: BoardEvent[] = [];
  assertEquals(applyMovedEvents(events, new Map()), events);
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

Deno.test("isCalendarResource accepts resources with a description", () => {
  const resource: CalendarResource = {
    id: "KH05",
    title: "KH05",
    description: "Kletshok 05",
  };
  assert(isCalendarResource(resource));
});

Deno.test("isCalendarResource rejects plain resources", () => {
  assertEquals(isCalendarResource({ id: "KH05", title: "KH05" }), false);
});

Deno.test("toDomTheme maps the MUI palette onto theme tokens", () => {
  const palette = {
    secondary: { main: "#be1574" },
    divider: "#e0e0e0",
    text: {
      primary: "rgba(0, 0, 0, 0.87)",
      secondary: "rgba(0, 0, 0, 0.6)",
      disabled: "rgba(0, 0, 0, 0.38)",
    },
  };
  const domTheme = toDomTheme(palette);
  assertEquals(domTheme.gridLine, "#e0e0e0");
  assertEquals(domTheme.text, "rgba(0, 0, 0, 0.87)");
  assertEquals(domTheme.textMuted, "rgba(0, 0, 0, 0.6)");
  assertEquals(domTheme.nowIndicator, "#be1574");
  assertEquals(domTheme.eventBackground, READ_ONLY_EVENT_BACKGROUND);
  assert(domTheme.eventBackground !== EDITABLE_EVENT_BACKGROUND);
});
