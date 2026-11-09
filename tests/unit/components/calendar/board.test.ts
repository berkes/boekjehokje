/**
 * Unit tests for the calendar super-calendar translation utilities
 *
 * Verifies the mapping from the domain model (rooms, bookings, plain
 * Dates) to the shapes @super-calendar/dom expects: resource lanes,
 * board events and dom theme tokens.
 */
import { assert, assertEquals } from "@std/assert";
import type { Booking } from "../../../../src/services/index.ts";
import { OverlapsService } from "../../../../src/services/overlaps/index.ts";
import {
  applyMovedEvents,
  type BoardEvent,
  type CalendarResource,
  checkMargin,
  defaultSlotAt,
  EDITABLE_EVENT_BACKGROUND,
  findBooking,
  formatDateTimeLocal,
  isCalendarResource,
  isInvertedRange,
  isLongBooking,
  LONG_BOOKING_MINUTES,
  MARGIN_MINUTES,
  markConflicts,
  READ_ONLY_EVENT_BACKGROUND,
  roomDescription,
  roomLabel,
  toDomTheme,
  toEvents,
  toPreviewEvent,
  toResources,
  withUnknownLast,
} from "../../../../src/components/calendar/board.ts";

const overlapsService = new OverlapsService();

function markConflictsWithService(
  events: Parameters<typeof markConflicts>[0],
  rooms: Parameters<typeof markConflicts>[1],
  excludeBookingId?: string,
) {
  return markConflicts(events, rooms, overlapsService, excludeBookingId);
}

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: "id-1",
    uid: "uid-1",
    summary: "Summary",
    htmlLink: null,
    room: "Kletshok 05",
    booker: null,
    editable: false,
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
  const events = toEvents([
    {
      canonicalName: "Kletshok 05",
      shortName: "KH05",
      bookings: [
        booking({ booker: "Alice", summary: "Overleg" }),
      ],
    },
  ]);
  assertEquals(events.length, 1);
  assertEquals(events[0].title, "Alice");
  assertEquals(events[0].start, new Date(2026, 1, 19, 10, 0, 0));
  assertEquals(events[0].end, new Date(2026, 1, 19, 11, 0, 0));
  assertEquals(events[0].resourceId, "Kletshok 05");
  assertEquals(events[0].booking?.summary, "Overleg");
});

Deno.test("toEvents keeps editable bookings editable and draggable", () => {
  const events = toEvents([
    {
      canonicalName: "Kletshok 05",
      shortName: "KH05",
      bookings: [booking({ booker: "Alice", editable: true })],
    },
  ]);
  assertEquals(events[0].editable, true);
  assertEquals(events[0].draggable, true);
});

Deno.test("toEvents keeps read-only bookings locked", () => {
  const events = toEvents([
    {
      canonicalName: "Kletshok 05",
      shortName: "KH05",
      bookings: [booking({ booker: "Alice", editable: false })],
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
  const events = toEvents([
    {
      canonicalName: "Kletshok 05",
      shortName: "KH05",
      bookings: [booking({ id: "id-1", editable: true })],
    },
  ]);
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

Deno.test("defaultSlotAt without a preceding booking starts at the whole hour and ends five to the next hour (ADR-0006)", () => {
  const slot = defaultSlotAt(new Date(2026, 9, 28, 10, 23), []);

  assertEquals(MARGIN_MINUTES, 5);
  assertEquals(slot.start, new Date(2026, 9, 28, 10, 0, 0));
  assertEquals(slot.end, new Date(2026, 9, 28, 10, 55, 0));
});

Deno.test("defaultSlotAt clicked on the whole hour ends five to the next hour", () => {
  const slot = defaultSlotAt(new Date(2026, 9, 28, 15, 0), []);

  assertEquals(slot.start, new Date(2026, 9, 28, 15, 0, 0));
  assertEquals(slot.end, new Date(2026, 9, 28, 15, 55, 0));
});

Deno.test("defaultSlotAt after a booking ending at the whole hour starts five minutes later (ADR-0006)", () => {
  const bookings = [{
    start: new Date(2026, 9, 28, 9, 0),
    end: new Date(2026, 9, 28, 13, 0),
  }];
  const slot = defaultSlotAt(new Date(2026, 9, 28, 13, 30), bookings);

  assertEquals(slot.start, new Date(2026, 9, 28, 13, 5, 0));
  assertEquals(slot.end, new Date(2026, 9, 28, 13, 55, 0));
});

Deno.test("defaultSlotAt after a booking ending at an arbitrary time starts five minutes after it", () => {
  const bookings = [{
    start: new Date(2026, 9, 28, 12, 0),
    end: new Date(2026, 9, 28, 13, 30),
  }];
  const slot = defaultSlotAt(new Date(2026, 9, 28, 13, 50), bookings);

  assertEquals(slot.start, new Date(2026, 9, 28, 13, 35, 0));
  assertEquals(slot.end, new Date(2026, 9, 28, 14, 55, 0));
});

Deno.test("defaultSlotAt skips a whole hour less than 30 minutes after the slot start", () => {
  const bookings = [{
    start: new Date(2026, 9, 28, 11, 0),
    end: new Date(2026, 9, 28, 13, 35),
  }];
  // slot starts at 13:40; 14:00 is only 20 minutes away, so the proposal
  // runs until 14:55 (five to 15:00)
  const slot = defaultSlotAt(new Date(2026, 9, 28, 13, 50), bookings);

  assertEquals(slot.start, new Date(2026, 9, 28, 13, 40, 0));
  assertEquals(slot.end, new Date(2026, 9, 28, 14, 55, 0));
});

Deno.test("defaultSlotAt does not mutate the clicked time", () => {
  const at = new Date(2026, 9, 28, 10, 59, 30);
  defaultSlotAt(at, []);

  assertEquals(at, new Date(2026, 9, 28, 10, 59, 30));
});

Deno.test("checkMargin flags a zero-minute gap to an adjacent booking (ADR-0006)", () => {
  const bookings = [{
    start: new Date(2026, 9, 28, 11, 0),
    end: new Date(2026, 9, 28, 14, 0),
  }];

  const before = checkMargin(
    bookings,
    new Date(2026, 9, 28, 10, 0),
    new Date(2026, 9, 28, 11, 0),
  );
  assertEquals(before, { zeroGap: true });

  const after = checkMargin(
    bookings,
    new Date(2026, 9, 28, 14, 0),
    new Date(2026, 9, 28, 15, 0),
  );
  assertEquals(after, { zeroGap: true });
});

Deno.test("checkMargin does not flag an overlap as a zero gap (overlaps are findOverlaps' job, issue #16)", () => {
  const bookings = [{
    start: new Date(2026, 9, 28, 11, 0),
    end: new Date(2026, 9, 28, 14, 0),
    summary: "Kletshok 03 - Willem",
  }];

  const result = checkMargin(
    bookings,
    new Date(2026, 9, 28, 10, 30),
    new Date(2026, 9, 28, 11, 30),
  );
  assertEquals(result, { zeroGap: false });
});

Deno.test("checkMargin passes a booking with a five-minute margin on both sides", () => {
  const bookings = [
    { start: new Date(2026, 9, 28, 9, 0), end: new Date(2026, 9, 28, 10, 0) },
    { start: new Date(2026, 9, 28, 11, 0), end: new Date(2026, 9, 28, 12, 0) },
  ];

  const result = checkMargin(
    bookings,
    new Date(2026, 9, 28, 10, 5),
    new Date(2026, 9, 28, 10, 55),
  );
  assertEquals(result, { zeroGap: false });
});

Deno.test("markConflicts flags a free-slot block that overlaps a booking (issue #16)", () => {
  const rooms = [{
    canonicalName: "Kletshok 03",
    shortName: "KH 03",
    bookings: [
      booking({
        id: "willem",
        booker: "Willem",
        start: new Date(2026, 9, 28, 11, 0),
        end: new Date(2026, 9, 28, 13, 0),
      }),
    ],
  }];
  const events: BoardEvent[] = [{
    title: "Nu boeken",
    start: new Date(2026, 9, 28, 10, 30),
    end: new Date(2026, 9, 28, 11, 30),
    resourceId: "Kletshok 03",
    freeSlot: {
      start: new Date(2026, 9, 28, 10, 30),
      end: new Date(2026, 9, 28, 11, 30),
    },
    draggable: false,
  }];

  const marked = markConflictsWithService(events, rooms);

  assertEquals(marked[0].conflict, true);
  // The original event stays untouched
  assertEquals(events[0].conflict, undefined);
});

Deno.test("markConflicts leaves free-slot blocks without an overlap unmarked", () => {
  const rooms = [{
    canonicalName: "Kletshok 03",
    shortName: "KH 03",
    bookings: [
      booking({
        id: "willem",
        booker: "Willem",
        start: new Date(2026, 9, 28, 11, 0),
        end: new Date(2026, 9, 28, 13, 0),
      }),
    ],
  }];
  const events: BoardEvent[] = [{
    title: "Nu boeken",
    start: new Date(2026, 9, 28, 14, 0),
    end: new Date(2026, 9, 28, 14, 55),
    resourceId: "Kletshok 03",
    freeSlot: {
      start: new Date(2026, 9, 28, 14, 0),
      end: new Date(2026, 9, 28, 14, 55),
    },
    draggable: false,
  }];

  assertEquals(markConflictsWithService(events, rooms)[0].conflict, undefined);
});

Deno.test("markConflicts marks both bookings of an overlapping pair, but never a booking against itself (issue #16)", () => {
  const rooms = [{
    canonicalName: "Kletshok 03",
    shortName: "KH 03",
    bookings: [
      booking({
        id: "willem",
        booker: "Willem",
        start: new Date(2026, 9, 28, 10, 0),
        end: new Date(2026, 9, 28, 12, 0),
      }),
      booking({
        id: "sanne",
        booker: "Sanne",
        start: new Date(2026, 9, 28, 11, 0),
        end: new Date(2026, 9, 28, 13, 0),
      }),
    ],
  }];
  const events = toEvents(rooms);

  const marked = markConflictsWithService(events, rooms);

  assertEquals(marked[0].conflict, true);
  assertEquals(marked[1].conflict, true);
});

Deno.test("markConflicts never marks the booking being edited against its own draft (issue #16)", () => {
  const rooms = [{
    canonicalName: "Kletshok 03",
    shortName: "KH 03",
    bookings: [
      booking({
        id: "willem",
        booker: "Willem",
        editable: true,
        start: new Date(2026, 9, 28, 11, 0),
        end: new Date(2026, 9, 28, 13, 0),
      }),
    ],
  }];
  const bookingEvent = toEvents(rooms)[0];
  const slotEvent: BoardEvent = {
    title: "Nu boeken",
    start: new Date(2026, 9, 28, 10, 30),
    end: new Date(2026, 9, 28, 11, 30),
    resourceId: "Kletshok 03",
    freeSlot: {
      start: new Date(2026, 9, 28, 10, 30),
      end: new Date(2026, 9, 28, 11, 30),
    },
    preview: true,
    draggable: false,
  };

  const marked = markConflictsWithService(
    [bookingEvent, slotEvent],
    rooms,
    "willem",
  );

  // The edited booking never conflicts with itself, and the draft in its
  // own range does not count as an overlap with it either
  assertEquals(marked[0].conflict, undefined);
  assertEquals(marked[1].conflict, undefined);
});

Deno.test("formatDateTimeLocal formats a date for a datetime-local input", () => {
  assertEquals(
    formatDateTimeLocal(new Date(2026, 9, 28, 10, 5)),
    "2026-10-28T10:05",
  );
  assertEquals(
    formatDateTimeLocal(new Date(2026, 9, 28, 9, 0)),
    "2026-10-28T09:00",
  );
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

Deno.test("toPreviewEvent renders the draft as a preview block in a visible room", () => {
  const rooms = [{
    canonicalName: "Kletshok 03",
    shortName: "KH 03",
    bookings: [],
  }];
  const draft = {
    room: "Kletshok 03",
    start: new Date(2026, 9, 28, 10, 0),
    end: new Date(2026, 9, 28, 10, 55),
  };

  const event = toPreviewEvent(draft, rooms, null);

  assert(event !== null);
  assertEquals(event.preview, true);
  assertEquals(event.resourceId, "Kletshok 03");
  assertEquals(event.start, draft.start);
  assertEquals(event.end, draft.end);
});

Deno.test("toPreviewEvent returns null when the draft room is hidden", () => {
  const rooms = [{
    canonicalName: "Kletshok 03",
    shortName: "KH 03",
    bookings: [],
  }];
  const draft = {
    room: "Stilteruimte",
    start: new Date(2026, 9, 28, 10, 0),
    end: new Date(2026, 9, 28, 10, 55),
  };

  assertEquals(toPreviewEvent(draft, rooms, null), null);
});

Deno.test("toPreviewEvent returns null while the draft equals the selected slot", () => {
  const rooms = [{
    canonicalName: "Kletshok 03",
    shortName: "KH 03",
    bookings: [],
  }];
  const selected = {
    room: "Kletshok 03",
    start: new Date(2026, 9, 28, 10, 0),
    end: new Date(2026, 9, 28, 10, 55),
  };

  assertEquals(toPreviewEvent(selected, rooms, selected), null);
});

Deno.test("isLongBooking flags ranges longer than 3 hours", () => {
  assertEquals(LONG_BOOKING_MINUTES, 180);
  assertEquals(
    isLongBooking(new Date(2026, 9, 28, 13, 5), new Date(2026, 9, 28, 16, 5)),
    false,
  );
  assertEquals(
    isLongBooking(new Date(2026, 9, 28, 13, 5), new Date(2026, 9, 28, 16, 6)),
    true,
  );
});

Deno.test("isInvertedRange flags a Van that is not before Tot", () => {
  assertEquals(
    isInvertedRange(
      new Date(2026, 9, 28, 10, 0),
      new Date(2026, 9, 28, 10, 55),
    ),
    false,
  );
  assertEquals(
    isInvertedRange(new Date(2026, 9, 28, 11, 0), new Date(2026, 9, 28, 10, 0)),
    true,
  );
  assertEquals(
    isInvertedRange(new Date(2026, 9, 28, 10, 0), new Date(2026, 9, 28, 10, 0)),
    true,
  );
});
