/**
 * Unit tests for CalendarService
 *
 * Tests use Deno's mocking APIs from @std/testing/mock.
 * This demonstrates how to test the service layer using proper Deno mocking.
 */

import {
  CalendarService,
  getNextWeek,
  getThisWeek,
} from "../CalendarService.ts";
import type { CalendarEvent } from "../../utils/types.ts";

import { assert, assertEquals } from "@std/assert";
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
    start: { dateTime: startDate },
    end: { dateTime: endDate },
    created: "2026-10-05T09:00:00Z",
    updated: "2026-10-05T09:00:00Z",
    status: "confirmed",
    sequence: 0,
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
    listCalendars: () => Promise.resolve([]),
  };

  const service = new CalendarService(mockClient, CALENDAR_ID);
  const week = getThisWeek();

  // Call the method
  await service.getBookings(week);

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
    listCalendars: () => Promise.resolve([]),
  };

  const service = new CalendarService(mockClient, customCalendarId);
  const week = getThisWeek();

  await service.getBookings(week);

  const fetchEventsSpy = mockClient.fetchEvents as unknown as ReturnType<
    typeof spy
  >;
  assertSpyCalls(fetchEventsSpy, 1);
  assertSpyCallArg(fetchEventsSpy, 0, 0, customCalendarId);
});
