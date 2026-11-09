/**
 * Unit tests for the room parser
 *
 * Tests the public interface of parser.ts: parseEvent. The room and
 * booker extraction tables drive parseEvent with full event summaries
 * and assert on the ParsedEvent attributes. The serializer
 * bookingToEvent (the inverse of parseEvent) lives in eventFormat.ts and
 * is round-trip tested here. Grouping and ignore-list behavior is covered
 * through the CalendarService in CalendarService.test.ts.
 */

import type { StoredEvent } from "../CalendarEventRepositoryPort.ts";
import { bookingToEvent } from "../eventFormat.ts";
import { parseEvent } from "../parser.ts";
import { ROOMS, UNKNOWN_ROOM } from "../rooms.ts";

import { assert, assertEquals } from "@std/assert";

/**
 * A minimal stored event carrying the given summary, for driving
 * parseEvent in the extraction tables
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
)("parseEvent($input).room -> $expected", ({ input, expected }) => {
  assertEquals(parseEvent(eventWithSummary(input)).room, expected);
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
      input: "KH 03",
      expected: null,
    },
  ],
)("parseEvent($input).booker -> $expected", ({ input, expected }) => {
  assertEquals(parseEvent(eventWithSummary(input)).booker, expected);
});

Deno.test("parseEvent", () => {
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

Deno.test("Workshopruimte is no longer a known room", () => {
  assert(
    !ROOMS.some((room) => room.canonicalName === "Workshopruimte C3"),
    "No room should match the workshop identifiers",
  );
  assertEquals(parseEvent(eventWithSummary("workshop c3")).room, UNKNOWN_ROOM);
  assertEquals(
    parseEvent(eventWithSummary("workshopruimte c3")).room,
    UNKNOWN_ROOM,
  );
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

Deno.test("The Unknown room config is included in ROOMS", () => {
  const unknownRoom = ROOMS.find((room) => room.canonicalName === UNKNOWN_ROOM);
  assert(unknownRoom !== undefined, "The Unknown room should be in ROOMS");
  assertEquals(unknownRoom?.canonicalName, UNKNOWN_ROOM);
});

Deno.test("bookingToEvent serializes into the standardized format the parser reads back", () => {
  const event = bookingToEvent({
    room: "Kletshok 03",
    booker: "Bèr",
    contact: "ber@boekjehokje.test",
    start: new Date("2026-10-28T10:00:00Z"),
    end: new Date("2026-10-28T10:55:00Z"),
  });

  assertEquals(event.summary, "KH 03 | Bèr");
  assertEquals(event.description, "ber@boekjehokje.test");
  assertEquals(event.start, new Date("2026-10-28T10:00:00Z"));
  assertEquals(event.end, new Date("2026-10-28T10:55:00Z"));

  // Round-trip: parsing the written event yields the same room and
  // booker (parseEvent is the inverse of bookingToEvent)
  const parsed = parseEvent({
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

Deno.test("bookingToEvent round-trips every bookable room", () => {
  const bookableRooms = ROOMS
    .filter((room) => room.canonicalName !== UNKNOWN_ROOM)
    .map((room) => room.canonicalName);

  for (const room of bookableRooms) {
    const event = bookingToEvent({
      room,
      booker: "Sanne",
      start: new Date("2026-10-28T10:00:00Z"),
      end: new Date("2026-10-28T11:00:00Z"),
    });
    const parsed = parseEvent({
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

Deno.test("bookingToEvent omits the description when there is no contact", () => {
  const event = bookingToEvent({
    room: "Stilteruimte",
    booker: "Bèr",
    contact: "  ",
    start: new Date("2026-10-28T10:00:00Z"),
    end: new Date("2026-10-28T11:00:00Z"),
  });
  assertEquals(event.summary, "Stilteruimte | Bèr");
  assert(!("description" in event), "no empty description is written");
});

Deno.test("parseEvent keeps the event's htmlLink, null when the API provides none", () => {
  const base = eventWithSummary("Kletshok 03 - Bèr");

  const withLink = parseEvent({
    ...base,
    htmlLink: "https://calendar.google.com/calendar/event?eid=abc123",
  });
  assertEquals(
    withLink.htmlLink,
    "https://calendar.google.com/calendar/event?eid=abc123",
  );

  const withoutLink = parseEvent(base);
  assertEquals(withoutLink.htmlLink, null);
});
