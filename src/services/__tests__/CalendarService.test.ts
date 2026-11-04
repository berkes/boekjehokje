/**
 * Unit tests for the Google Calendar adapter
 *
 * Tests use Deno's mocking APIs from @std/testing/mock.
 * This demonstrates how to test the adapter layer using proper Deno mocking.
 */

import { GoogleCalendarAdapter } from "../GoogleCalendarAdapter.ts";
import {
  type BookingUpdate,
  getNextWeek,
  getThisWeek,
  type NewBooking,
} from "../CalendarServicePort.ts";
import type { CalendarEvent, CalendarEventDraft } from "../../utils/types.ts";
import { CalendarApiError } from "../../utils/googleCalendarApi.ts";

import { assert, assertEquals, assertRejects } from "@std/assert";
import { assertSpyCallArg, assertSpyCalls, spy } from "@std/testing/mock";

const CALENDAR_ID = "nyma-fake-calendar@example.com";

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

Deno.test("getThisWeek returns correct Monday-Sunday range", () => {
  const thisWeek = getThisWeek();

  // Start should be Monday
  assertEquals(thisWeek.start.getDay(), 1, "Start should be Monday (1)");

  // End should be Sunday
  assertEquals(thisWeek.end.getDay(), 0, "End should be Sunday (0)");

  // End should be 7 days after start (Monday to Sunday inclusive)
  const timeDiff = thisWeek.end.getTime() - thisWeek.start.getTime();
  const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
  assertEquals(
    Math.round(daysDiff),
    7,
    "Week should span 7 days (Monday to Sunday inclusive)",
  );
});

Deno.test("getNextWeek returns correct range after this week", () => {
  const thisWeek = getThisWeek();
  const nextWeek = getNextWeek();

  // Next week start should be after this week end
  assert(
    nextWeek.start.getTime() > thisWeek.end.getTime(),
    "Next week start should be after this week end",
  );

  // Next week should also be Monday-Sunday
  assertEquals(
    nextWeek.start.getDay(),
    1,
    "Next week start should be Monday (1)",
  );
  assertEquals(nextWeek.end.getDay(), 0, "Next week end should be Sunday (0)");
});

Deno.test("getRoomsThisWeek calls API client with correct attributes", async () => {
  const mockEvents: CalendarEvent[] = [
    createMockEvent(
      "event-1",
      "uid-1",
      "05 kletshok - Peter",
      "2026-10-06T10:00:00Z",
      "2026-10-06T11:00:00Z",
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
  const week = getThisWeek();

  // Call the method
  await service.getRoomsWithBookings(week);

  // Verify fetchEvents was called with correct parameters
  const fetchEventsSpy = mockClient.fetchEvents as unknown as ReturnType<
    typeof spy
  >;
  assertSpyCalls(fetchEventsSpy, 1);

  // Check the first call arguments
  assertSpyCallArg(fetchEventsSpy, 0, 0, CALENDAR_ID);
  assertSpyCallArg(fetchEventsSpy, 0, 1, week.start);
  assertSpyCallArg(fetchEventsSpy, 0, 2, week.end);
});

Deno.test("getRoomsThisWeek calls API client with custom calendar ID", async () => {
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
  const week = getThisWeek();

  await service.getRoomsWithBookings(week);

  const fetchEventsSpy = mockClient.fetchEvents as unknown as ReturnType<
    typeof spy
  >;
  assertSpyCalls(fetchEventsSpy, 1);
  assertSpyCallArg(fetchEventsSpy, 0, 0, customCalendarId);
});

Deno.test("getRoomsWithBookings marks bookings of the profile user editable", async () => {
  const mockEvents: CalendarEvent[] = [
    createMockEvent(
      "event-1",
      "uid-1",
      "Kletshok 05 - B\u00e8r",
      "2026-10-06T10:00:00Z",
      "2026-10-06T11:00:00Z",
    ),
    createMockEvent(
      "event-2",
      "uid-2",
      "Kletshok 05 - Sanne",
      "2026-10-06T12:00:00Z",
      "2026-10-06T13:00:00Z",
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

  const rooms = await service.getRoomsWithBookings();
  const bookings = rooms.flatMap((room) => room.bookings);

  const own = bookings.find((b) => b.id === "event-1");
  const other = bookings.find((b) => b.id === "event-2");
  assert(own, "own booking should be present");
  assert(other, "other booking should be present");
  assert(own.editable, "booking created by the profile user is editable");
  assert(!other.editable, "booking created by someone else is read-only");
});

Deno.test("getRoomsWithBookings marks all bookings read-only without a profile", async () => {
  const mockEvents: CalendarEvent[] = [
    createMockEvent(
      "event-1",
      "uid-1",
      "Kletshok 05 - B\u00e8r",
      "2026-10-06T10:00:00Z",
      "2026-10-06T11:00:00Z",
    ),
  ];

  const mockClient = {
    fetchEvents: () => Promise.resolve(mockEvents),
    ...writeOps(),
    listCalendars: () => Promise.resolve([]),
  };

  const service = new GoogleCalendarAdapter(mockClient, CALENDAR_ID, null);
  const rooms = await service.getRoomsWithBookings();
  const bookings = rooms.flatMap((room) => room.bookings);
  assertEquals(bookings.length, 1);
  assert(!bookings[0].editable, "without a profile nothing is editable");
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
