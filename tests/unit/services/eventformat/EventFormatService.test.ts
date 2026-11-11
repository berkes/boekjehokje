/**
 * Unit tests for the event format service
 *
 * Tests the public interface of the eventformat module (EventFormatPort):
 * parse (room and booker extraction tables, driven with full event
 * summaries) and serialize (the inverse of parse, round-trip tested here).
 * Grouping and ignore-list behavior is covered through the CalendarService
 * in CalendarService.test.ts.
 */

import type { StoredEvent } from "../../../../src/services/calendar/CalendarEventRepositoryPort.ts";
import { EventFormatService } from "../../../../src/services/eventformat/index.ts";
import {
  RoomsService,
  UNKNOWN_ROOM,
} from "../../../../src/services/rooms/index.ts";

import { assert, assertEquals } from "@std/assert";

const service = new EventFormatService({ rooms: new RoomsService() });
const rooms = new RoomsService();

/**
 * A minimal stored event carrying the given summary, for driving
 * parse in the extraction tables
 */
function eventWithSummary(summary: string): StoredEvent {
  return {
    id: "event-1",
    uid: "uid-1",
    summary,
    htmlLink: null,
    creatorEmail: "booker@example.com",
    start: new Date("2026-10-06T10:00:00Z"),
    end: new Date("2026-10-06T11:00:00Z"),
    created: new Date("2026-10-05T09:00:00Z"),
    status: "confirmed",
    sequence: 0,
  };
}

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
      input: "kh5",
      expected: "Kletshok 05",
    },
    {
      input: "kletshok5",
      expected: "Kletshok 05",
    },
    {
      input: "05 KH",
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

    // Summaries with a booker appended
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
      input: "04 kletshok| klets kevin",
      expected: "Kletshok 04",
    },
    {
      input: "02 stilte ruimte| studio s",
      expected: "Stilteruimte",
    },
    {
      input: "Torenkamer WT-04 I EV's NYMA",
      expected: UNKNOWN_ROOM,
    },
    {
      input: "Team Meeting",
      expected: UNKNOWN_ROOM,
    },
  ],
)("service.parse($input).room -> $expected", ({ input, expected }) => {
  assertEquals(service.parse(eventWithSummary(input)).room, expected);
});

Deno.test.each(
  [
    {
      name: "Room and dash removed: 05 kletshok - Peter",
      input: "05 kletshok - Peter",
      expected: "Peter",
    },
    {
      name: "Exclusion word removed: 04 Kletshok | Vincent unit 59",
      input: "04 Kletshok | Vincent unit 59",
      expected: "Vincent 59",
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
    {
      name: "Multi-word booker: Tuinkamer - Vincent van Gogh",
      input: "Tuinkamer - Vincent van Gogh",
      expected: "Vincent van Gogh",
    },
    {
      name: "Unknown room: the leftover summary is the name",
      input: "Werkplaats overleg - Griet",
      expected: "Werkplaats overleg - Griet",
    },
    {
      name: "Only a room: no name left",
      input: "03 KH",
      expected: null,
    },
  ],
)("service.parse($input).booker -> $expected", ({ input, expected }) => {
  assertEquals(service.parse(eventWithSummary(input)).booker, expected);
});

Deno.test("parse", () => {
  const mockEvent: StoredEvent = {
    id: "test-id",
    uid: "test-uid",
    summary: "05 kletshok - Peter",
    htmlLink: null,
    creatorEmail: "peter@example.com",
    start: new Date("2026-10-06T10:00:00Z"),
    end: new Date("2026-10-06T11:00:00Z"),
    created: new Date("2026-10-05T09:00:00Z"),
    status: "confirmed",
    sequence: 0,
  };

  const result = service.parse(mockEvent);

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

Deno.test("serialize produces the standardized format that parse reads back", () => {
  const event = service.serialize({
    room: "Kletshok 03",
    booker: "Bèr",
    contact: "ber@boekjehokje.test",
    start: new Date("2026-10-28T10:00:00Z"),
    end: new Date("2026-10-28T10:55:00Z"),
  });

  assertEquals(event.summary, "03 KH | Bèr");
  assertEquals(event.description, "ber@boekjehokje.test");
  assertEquals(event.start, new Date("2026-10-28T10:00:00Z"));
  assertEquals(event.end, new Date("2026-10-28T10:55:00Z"));

  // Round-trip: parsing the written event yields the same room and
  // booker (parse is the inverse of serialize)
  const parsed = service.parse({
    ...eventWithSummary(event.summary),
    creatorEmail: "ber@boekjehokje.test",
    start: event.start,
    end: event.end,
  });
  assertEquals(parsed.room, "Kletshok 03");
  assertEquals(parsed.booker, "Bèr");
  assertEquals(parsed.start, new Date("2026-10-28T10:00:00Z"));
  assertEquals(parsed.end, new Date("2026-10-28T10:55:00Z"));
});

Deno.test("serialize round-trips every bookable room", () => {
  const bookableRooms = rooms
    .bookable()
    .map((room) => room.canonicalName);

  for (const room of bookableRooms) {
    const event = service.serialize({
      room,
      booker: "Sanne",
      start: new Date("2026-10-28T10:00:00Z"),
      end: new Date("2026-10-28T11:00:00Z"),
    });
    const parsed = service.parse({
      ...eventWithSummary(event.summary),
      creatorEmail: "sanne@example.com",
      start: event.start,
      end: event.end,
    });
    assertEquals(parsed.room, room, `room should round-trip for ${room}`);
    assertEquals(
      parsed.booker,
      "Sanne",
      `booker should round-trip for ${room}`,
    );
  }
});

Deno.test("serialize omits the description when there is no contact", () => {
  const event = service.serialize({
    room: "Stilteruimte",
    booker: "Bèr",
    contact: "  ",
    start: new Date("2026-10-28T10:00:00Z"),
    end: new Date("2026-10-28T11:00:00Z"),
  });
  assertEquals(event.summary, "Stilteruimte | Bèr");
  assert(!("description" in event), "no empty description is written");
});

Deno.test("parse keeps the event's htmlLink, null when the source provides none", () => {
  const base = eventWithSummary("Kletshok 03 - Bèr");

  const withLink = service.parse({
    ...base,
    htmlLink: "https://calendar.google.com/calendar/event?eid=abc123",
  });
  assertEquals(
    withLink.htmlLink,
    "https://calendar.google.com/calendar/event?eid=abc123",
  );

  const withoutLink = service.parse(base);
  assertEquals(withoutLink.htmlLink, null);
});
