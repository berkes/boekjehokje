/**
 * Unit tests for the Google Calendar adapter
 *
 * Tests use Deno's mocking APIs from @std/testing/mock.
 * This demonstrates how to test the adapter layer using proper Deno mocking.
 */

import { GoogleCalendarAdapter } from "../GoogleCalendarAdapter.ts";
import {
  type BookingUpdate,
  getDayRange,
  type NewBooking,
} from "../CalendarServicePort.ts";
import { ROOMS } from "../rooms.ts";
import type { CalendarEvent, CalendarEventDraft } from "../../utils/types.ts";
import { CalendarApiError } from "../../utils/googleCalendarApi.ts";
import { isSameDay } from "../../utils/clock.ts";

import { assert, assertEquals, assertRejects } from "@std/assert";
import { assertSpyCallArg, assertSpyCalls, spy } from "@std/testing/mock";

const CALENDAR_ID = "nyma-fake-calendar@example.com";

/**
 * The day the read tests query: Tuesday 6 October 2026, midday local
 * time, so the queried day is 6 October in every timezone
 */
const DAY = new Date(2026, 9, 6, 12, 0);

/**
 * ISO string of a local date-time on 2026-10-<day> at "hh:mm", so the
 * mock events land on local days whatever the test runner's timezone
 */
function localIso(day: number, hhmm: string): string {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return new Date(2026, 9, day, hours, minutes).toISOString();
}

function createMockEvent(
  id: string,
  uid: string,
  summary: string,
  startDate: string,
  endDate: string,
): CalendarEvent {
  return {
    id,
    uid,
    summary,
    creator: { email: "boeker@example.com" },
    start: { dateTime: startDate },
    end: { dateTime: endDate },
    created: "2026-10-05T09:00:00Z",
    updated: "2026-10-05T09:00:00Z",
    status: "confirmed",
    sequence: 0,
  };
}

/**
 * The write operations every fake client stubs out: create and update
 * echo the draft back as a stored event (with an id and creator, like
 * the calendar does), delete resolves.
 */
function writeOps(creatorEmail = "boeker@example.com") {
  const stored = (event: CalendarEventDraft, id: string): CalendarEvent => ({
    id,
    uid: `${id}@example.com`,
    summary: event.summary,
    creator: { email: creatorEmail },
    start: event.start,
    end: event.end,
    created: "2026-10-28T09:00:00Z",
    updated: "2026-10-28T09:00:00Z",
    status: "confirmed",
    sequence: 0,
  });
  return {
    createEvent: spy((_calendarId: string, event: CalendarEventDraft) =>
      Promise.resolve(stored(event, "created-event"))
    ),
    updateEvent: spy(
      (_calendarId: string, eventId: string, changes: CalendarEventDraft) =>
        Promise.resolve(stored(changes, eventId)),
    ),
    deleteEvent: spy((_calendarId: string, _eventId: string) =>
      Promise.resolve()
    ),
  };
}

Deno.test("getDayRange returns the local midnight-to-midnight range of the day", () => {
  const range = getDayRange(DAY);

  assert(isSameDay(range.start, DAY), "Start should be on the queried day");
  assertEquals(range.start.getHours(), 0, "Start should be midnight");
  assertEquals(range.start.getMinutes(), 0);
  assertEquals(range.start.getSeconds(), 0);
  assertEquals(range.start.getMilliseconds(), 0);

  assert(isSameDay(range.end, DAY), "End should be on the queried day");
  assertEquals(range.end.getHours(), 23, "End should be the day's last hour");
  assertEquals(range.end.getMinutes(), 59);
  assertEquals(range.end.getSeconds(), 59);
  assertEquals(range.end.getMilliseconds(), 999);

  assertEquals(
    range.end.getTime() - range.start.getTime(),
    24 * 60 * 60 * 1000 - 1,
    "The range should span the whole day",
  );
});

Deno.test("getDay calls API client with the range of the given day", async () => {
  const mockEvents: CalendarEvent[] = [
    createMockEvent(
      "event-1",
      "uid-1",
      "05 kletshok - Peter",
      localIso(6, "10:00"),
      localIso(6, "11:00"),
    ),
  ];

  // Create a mock client with spied methods
  const mockClient = {
    fetchEvents: spy((_calendarId: string, _timeMin?: Date, _timeMax?: Date) =>
      Promise.resolve(mockEvents)
    ),
    ...writeOps(),
    listCalendars: () => Promise.resolve([]),
  };

  const service = new GoogleCalendarAdapter(mockClient, CALENDAR_ID, null);

  // Call the method
  await service.getDay(DAY);

  // Verify fetchEvents was called with correct parameters
  const fetchEventsSpy = mockClient.fetchEvents as unknown as ReturnType<
    typeof spy
  >;
  assertSpyCalls(fetchEventsSpy, 1);

  // Check the first call arguments
  const range = getDayRange(DAY);
  assertSpyCallArg(fetchEventsSpy, 0, 0, CALENDAR_ID);
  assertSpyCallArg(fetchEventsSpy, 0, 1, range.start);
  assertSpyCallArg(fetchEventsSpy, 0, 2, range.end);
});

Deno.test("getDay without argument fetches today", async () => {
  const mockClient = {
    fetchEvents: spy((_calendarId: string, _timeMin?: Date, _timeMax?: Date) =>
      Promise.resolve([])
    ),
    ...writeOps(),
    listCalendars: () => Promise.resolve([]),
  };

  const service = new GoogleCalendarAdapter(mockClient, CALENDAR_ID, null);

  await service.getDay();

  const fetchEventsSpy = mockClient.fetchEvents as unknown as ReturnType<
    typeof spy
  >;
  assertSpyCalls(fetchEventsSpy, 1);
  const timeMin = fetchEventsSpy.calls[0].args[1] as Date;
  const timeMax = fetchEventsSpy.calls[0].args[2] as Date;
  assert(isSameDay(timeMin, new Date()), "timeMin should be today");
  assertEquals(timeMin.getHours(), 0, "timeMin should be midnight");
  assert(isSameDay(timeMax, new Date()), "timeMax should be today");
  assertEquals(timeMax.getHours(), 23, "timeMax should be the day's end");
});

Deno.test("getDay calls API client with custom calendar ID", async () => {
  const mockEvents: CalendarEvent[] = [];
  const customCalendarId = "custom-calendar-id";

  const mockClient = {
    fetchEvents: spy((_calendarId: string, _timeMin?: Date, _timeMax?: Date) =>
      Promise.resolve(mockEvents)
    ),
    ...writeOps(),
    listCalendars: () => Promise.resolve([]),
  };

  const service = new GoogleCalendarAdapter(mockClient, customCalendarId, null);

  await service.getDay(DAY);

  const fetchEventsSpy = mockClient.fetchEvents as unknown as ReturnType<
    typeof spy
  >;
  assertSpyCalls(fetchEventsSpy, 1);
  assertSpyCallArg(fetchEventsSpy, 0, 0, customCalendarId);
});

Deno.test("getDay includes bookings that start the previous day and end on the day", async () => {
  const mockEvents: CalendarEvent[] = [
    // Starts the day before, ends on the queried day: included
    createMockEvent(
      "night-before",
      "uid-nb",
      "Kletshok 05 - Peter",
      localIso(5, "23:00"),
      localIso(6, "01:00"),
    ),
    // Entirely on the day before: excluded
    createMockEvent(
      "day-before",
      "uid-db",
      "Kletshok 05 - Sanne",
      localIso(5, "10:00"),
      localIso(5, "11:00"),
    ),
    // During the queried day: included
    createMockEvent(
      "during",
      "uid-d",
      "Kletshok 05 - Fatima",
      localIso(6, "10:00"),
      localIso(6, "11:00"),
    ),
    // Starts on the queried day, ends the next day: included
    createMockEvent(
      "night-after",
      "uid-na",
      "Kletshok 05 - Ozan",
      localIso(6, "23:00"),
      localIso(7, "01:00"),
    ),
    // Entirely on the day after: excluded
    createMockEvent(
      "day-after",
      "uid-da",
      "Kletshok 05 - Jorien",
      localIso(7, "10:00"),
      localIso(7, "11:00"),
    ),
  ];

  const mockClient = {
    fetchEvents: () => Promise.resolve(mockEvents),
    ...writeOps(),
    listCalendars: () => Promise.resolve([]),
  };

  const service = new GoogleCalendarAdapter(mockClient, CALENDAR_ID, null);
  const rooms = await service.getDay(DAY);
  const bookings = rooms.flatMap((room) => room.bookings);

  assertEquals(
    bookings.map((b) => b.id).sort(),
    ["during", "night-after", "night-before"],
    "only the bookings overlapping the queried day are served",
  );
});

Deno.test("getDay marks bookings of the profile user editable", async () => {
  const mockEvents: CalendarEvent[] = [
    createMockEvent(
      "event-1",
      "uid-1",
      "Kletshok 05 - B\u00e8r",
      localIso(6, "10:00"),
      localIso(6, "11:00"),
    ),
    createMockEvent(
      "event-2",
      "uid-2",
      "Kletshok 05 - Sanne",
      localIso(6, "12:00"),
      localIso(6, "13:00"),
    ),
  ];
  mockEvents[0].creator = { email: "ber@berkes.nl" };

  const mockClient = {
    fetchEvents: () => Promise.resolve(mockEvents),
    ...writeOps(),
    listCalendars: () => Promise.resolve([]),
  };

  const service = new GoogleCalendarAdapter(
    mockClient,
    CALENDAR_ID,
    { name: "B\u00e8r", email: "BER@berkes.nl" },
  );

  const rooms = await service.getDay(DAY);
  const bookings = rooms.flatMap((room) => room.bookings);

  const own = bookings.find((b) => b.id === "event-1");
  const other = bookings.find((b) => b.id === "event-2");
  assert(own, "own booking should be present");
  assert(other, "other booking should be present");
  assert(own.editable, "booking created by the profile user is editable");
  assert(!other.editable, "booking created by someone else is read-only");
});

Deno.test("getDay marks all bookings read-only without a profile", async () => {
  const mockEvents: CalendarEvent[] = [
    createMockEvent(
      "event-1",
      "uid-1",
      "Kletshok 05 - B\u00e8r",
      localIso(6, "10:00"),
      localIso(6, "11:00"),
    ),
  ];

  const mockClient = {
    fetchEvents: () => Promise.resolve(mockEvents),
    ...writeOps(),
    listCalendars: () => Promise.resolve([]),
  };

  const service = new GoogleCalendarAdapter(mockClient, CALENDAR_ID, null);
  const rooms = await service.getDay(DAY);
  const bookings = rooms.flatMap((room) => room.bookings);
  assertEquals(bookings.length, 1);
  assert(!bookings[0].editable, "without a profile nothing is editable");
});

Deno.test("getDay keeps the event's htmlLink on the booking, null when the API provides none", async () => {
  const withLink = createMockEvent(
    "event-1",
    "uid-1",
    "05 kletshok - Peter",
    localIso(6, "10:00"),
    localIso(6, "11:00"),
  );
  withLink.htmlLink = "https://calendar.google.com/calendar/event?eid=abc123";
  const withoutLink = createMockEvent(
    "event-2",
    "uid-2",
    "Stilteruimte - Sanne",
    localIso(6, "12:00"),
    localIso(6, "13:00"),
  );

  const mockClient = {
    fetchEvents: () => Promise.resolve([withLink, withoutLink]),
    ...writeOps(),
    listCalendars: () => Promise.resolve([]),
  };

  const service = new GoogleCalendarAdapter(mockClient, CALENDAR_ID, null);
  const rooms = await service.getDay(DAY);
  const bookings = rooms.flatMap((room) => room.bookings);

  assertEquals(bookings.length, 2);
  assertEquals(
    bookings.find((booking) => booking.id === "event-1")?.htmlLink,
    "https://calendar.google.com/calendar/event?eid=abc123",
  );
  assertEquals(
    bookings.find((booking) => booking.id === "event-2")?.htmlLink,
    null,
    "an event without htmlLink yields null on the booking",
  );
});
Deno.test("getDay skips events on the ignore list", async () => {
  const mockEvents: CalendarEvent[] = [
    createMockEvent(
      "blocking-1",
      "blocking-uid-1",
      "C3 workshopruimte Team NYMA makersplaats",
      localIso(6, "09:00"),
      localIso(6, "17:00"),
    ),
    createMockEvent(
      "event-1",
      "uid-1",
      "05 kletshok - Peter",
      localIso(6, "10:00"),
      localIso(6, "11:00"),
    ),
  ];

  const mockClient = {
    fetchEvents: () => Promise.resolve(mockEvents),
    ...writeOps(),
    listCalendars: () => Promise.resolve([]),
  };

  const service = new GoogleCalendarAdapter(mockClient, CALENDAR_ID, null);
  const rooms = await service.getDay(DAY);

  const bookings = rooms.flatMap((room) => room.bookings);
  assertEquals(bookings.length, 1, "Only the normal event should remain");
  assertEquals(bookings[0].id, "event-1");
  assertEquals(
    rooms.find((room) => room.canonicalName === "Kletshok 05")?.bookings
      .length,
    1,
  );
});

Deno.test("getDay ignores inloopuurtje and bakwagen events", async () => {
  const mockEvents: CalendarEvent[] = [
    createMockEvent(
      "inloop-1",
      "inloop-uid-1",
      "Inloopuurtje huurders",
      localIso(6, "09:00"),
      localIso(6, "17:00"),
    ),
    createMockEvent(
      "bakwagen-1",
      "bakwagen-uid-1",
      "Bakwagen C3 bezet",
      localIso(6, "09:00"),
      localIso(6, "17:00"),
    ),
    createMockEvent(
      "event-1",
      "uid-1",
      "05 kletshok - Peter",
      localIso(6, "10:00"),
      localIso(6, "11:00"),
    ),
  ];

  const mockClient = {
    fetchEvents: () => Promise.resolve(mockEvents),
    ...writeOps(),
    listCalendars: () => Promise.resolve([]),
  };

  const service = new GoogleCalendarAdapter(mockClient, CALENDAR_ID, null);
  const rooms = await service.getDay(DAY);

  const bookings = rooms.flatMap((room) => room.bookings);
  assertEquals(bookings.length, 1, "Only the normal event should remain");
  assertEquals(bookings[0].id, "event-1");
});

Deno.test("getDay ignores any summary containing workshopruimte or torenkamer", async () => {
  const mockEvents: CalendarEvent[] = [
    createMockEvent(
      "ws-1",
      "ws-uid-1",
      "Workshopruimte - Peter",
      localIso(6, "09:00"),
      localIso(6, "10:00"),
    ),
    createMockEvent(
      "tk-1",
      "tk-uid-1",
      "Torenkamer WT-04 I EV's NYMA",
      localIso(6, "11:00"),
      localIso(6, "12:00"),
    ),
    createMockEvent(
      "event-1",
      "uid-1",
      "05 kletshok - Peter",
      localIso(6, "10:00"),
      localIso(6, "11:00"),
    ),
  ];

  const mockClient = {
    fetchEvents: () => Promise.resolve(mockEvents),
    ...writeOps(),
    listCalendars: () => Promise.resolve([]),
  };

  const service = new GoogleCalendarAdapter(mockClient, CALENDAR_ID, null);
  const rooms = await service.getDay(DAY);

  const bookings = rooms.flatMap((room) => room.bookings);
  assertEquals(bookings.length, 1, "Only the normal event should remain");
  assertEquals(bookings[0].id, "event-1");
});

Deno.test("getDay groups events per room and routes unmatched ones to Unknown", async () => {
  const mockEvents: CalendarEvent[] = [
    createMockEvent(
      "event-1",
      "uid-1",
      "05 kletshok - Peter",
      localIso(6, "10:00"),
      localIso(6, "11:00"),
    ),
    createMockEvent(
      "event-2",
      "uid-2",
      "Tuinkamer - Sanne",
      localIso(6, "12:00"),
      localIso(6, "13:00"),
    ),
    createMockEvent(
      "event-3",
      "uid-3",
      "Werkplaats overleg - Griet",
      localIso(6, "14:00"),
      localIso(6, "15:00"),
    ),
  ];

  const mockClient = {
    fetchEvents: () => Promise.resolve(mockEvents),
    ...writeOps(),
    listCalendars: () => Promise.resolve([]),
  };

  const service = new GoogleCalendarAdapter(mockClient, CALENDAR_ID, null);
  const rooms = await service.getDay(DAY);

  // Every room is served, also without bookings, sorted by canonical name
  assertEquals(rooms.length, ROOMS.length);
  const byName = new Map(rooms.map((room) => [room.canonicalName, room]));
  assertEquals(
    rooms.map((room) => room.canonicalName),
    [...ROOMS].map((room) => room.canonicalName).sort((a, b) =>
      a.localeCompare(b)
    ),
  );
  assertEquals(byName.get("Kletshok 05")?.shortName, "KH 05");
  assertEquals(byName.get("Kletshok 05")?.bookings.map((b) => b.id), [
    "event-1",
  ]);
  assertEquals(byName.get("Tuinkamer")?.bookings.map((b) => b.id), ["event-2"]);
  assertEquals(
    byName.get("Unknown")?.bookings[0].booker,
    "Werkplaats overleg - Griet",
  );
  assertEquals(
    byName.get("Kletshok 03")?.bookings.length,
    0,
    "rooms without bookings are served empty",
  );
});

Deno.test("createBooking writes the standardized event format to the calendar", async () => {
  const ops = writeOps("ber@berkes.nl");
  const mockClient = {
    fetchEvents: () => Promise.resolve([]),
    ...ops,
    listCalendars: () => Promise.resolve([]),
  };
  const service = new GoogleCalendarAdapter(mockClient, CALENDAR_ID, {
    name: "Bèr",
    email: "ber@berkes.nl",
  });

  const booking: NewBooking = {
    room: "Kletshok 03",
    booker: "Bèr",
    contact: "ber@boekjehokje.test",
    start: new Date("2026-10-28T10:00:00Z"),
    end: new Date("2026-10-28T10:55:00Z"),
  };

  const created = await service.createBooking(booking);

  assertSpyCalls(ops.createEvent, 1);
  assertSpyCallArg(ops.createEvent, 0, 0, CALENDAR_ID);
  assertSpyCallArg(ops.createEvent, 0, 1, {
    summary: "KH 03 | Bèr",
    description: "ber@boekjehokje.test",
    start: { dateTime: "2026-10-28T10:00:00.000Z" },
    end: { dateTime: "2026-10-28T10:55:00.000Z" },
  });

  // The stored event is parsed back into domain language (round-trip)
  assertEquals(created.id, "created-event");
  assertEquals(created.room, "Kletshok 03");
  assertEquals(created.booker, "Bèr");
  assertEquals(created.start, new Date("2026-10-28T10:00:00Z"));
  assertEquals(created.end, new Date("2026-10-28T10:55:00Z"));
  assert(created.editable, "the profile user's own booking is editable");
});

Deno.test("updateBooking patches the standardized event format onto the existing event", async () => {
  const ops = writeOps();
  const mockClient = {
    fetchEvents: () => Promise.resolve([]),
    ...ops,
    listCalendars: () => Promise.resolve([]),
  };
  const service = new GoogleCalendarAdapter(mockClient, CALENDAR_ID, null);

  const update: BookingUpdate = {
    id: "event-1",
    room: "Tuinkamer",
    booker: "Bèr",
    contact: "",
    start: new Date("2026-10-28T12:00:00Z"),
    end: new Date("2026-10-28T13:00:00Z"),
  };

  const updated = await service.updateBooking(update);

  assertSpyCalls(ops.updateEvent, 1);
  assertSpyCallArg(ops.updateEvent, 0, 0, CALENDAR_ID);
  assertSpyCallArg(ops.updateEvent, 0, 1, "event-1");
  assertSpyCallArg(ops.updateEvent, 0, 2, {
    summary: "TK | Bèr",
    start: { dateTime: "2026-10-28T12:00:00.000Z" },
    end: { dateTime: "2026-10-28T13:00:00.000Z" },
  });
  assertEquals(updated.id, "event-1");
  assertEquals(updated.room, "Tuinkamer");
  assertEquals(updated.booker, "Bèr");
  assert(!updated.editable, "without a profile the booking is read-only");
});

Deno.test("deleteBooking deletes the event from the calendar", async () => {
  const ops = writeOps();
  const mockClient = {
    fetchEvents: () => Promise.resolve([]),
    ...ops,
    listCalendars: () => Promise.resolve([]),
  };
  const service = new GoogleCalendarAdapter(mockClient, CALENDAR_ID, null);

  await service.deleteBooking("event-1");

  assertSpyCalls(ops.deleteEvent, 1);
  assertSpyCallArg(ops.deleteEvent, 0, 0, CALENDAR_ID);
  assertSpyCallArg(ops.deleteEvent, 0, 1, "event-1");
});

Deno.test("write operations propagate API errors to the caller", async () => {
  const failing = {
    ...writeOps(),
    createEvent: () => Promise.reject(new CalendarApiError("forbidden", 403)),
  };
  const mockClient = {
    fetchEvents: () => Promise.resolve([]),
    ...failing,
    listCalendars: () => Promise.resolve([]),
  };
  const service = new GoogleCalendarAdapter(mockClient, CALENDAR_ID, null);

  const booking: NewBooking = {
    room: "Kletshok 03",
    booker: "Bèr",
    contact: "",
    start: new Date("2026-10-28T10:00:00Z"),
    end: new Date("2026-10-28T10:55:00Z"),
  };

  await assertRejects(() => service.createBooking(booking), CalendarApiError);
});
