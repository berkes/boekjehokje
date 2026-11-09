/**
 * Unit tests for the calendar service
 *
 * The service is tested through its public interface (the
 * CalendarServicePort) with the central fakes from tests/utils: a
 * FakeCalendarEventRepository as the event repository, a FakeClock, and a
 * simple inline permission fake. The interaction with the real permission
 * service is covered by the integration tests in tests/integration.
 */

import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  FakeCalendarEventRepository,
  FakeClock,
  storedEvent,
} from "../../../utils/index.ts";
import type { StoredEvent } from "../../../../src/services/calendar/CalendarEventRepositoryPort.ts";
import { CalendarApiError } from "../../../../src/services/calendar/CalendarApiError.ts";
import { CalendarService } from "../../../../src/services/calendar/CalendarService.ts";
import {
  type BookingUpdate,
  getDayRange,
  type NewBooking,
} from "../../../../src/services/calendar/CalendarServicePort.ts";
import type { PermissionServicePort } from "../../../../src/services/permissions/PermissionServicePort.ts";
import { isSameDay } from "../../../../src/services/clock/dates.ts";
import { ROOMS } from "../../../../src/services/calendar/rooms.ts";

/**
 * The day the read tests query: Tuesday 6 October 2026, midday local
 * time, so the queried day is 6 October in every timezone
 */
const DAY = new Date(2026, 9, 6, 12, 0);

/**
 * A local date-time on 2026-10-<day> at "hh:mm", so the fake events land
 * on local days whatever the test runner's timezone
 */
function at(day: number, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return new Date(2026, 9, day, hours, minutes);
}

/**
 * A permission fake: every booking editable, or none
 */
function permissions(editable: boolean): PermissionServicePort {
  return { may: () => editable };
}

function makeService(
  events: StoredEvent[] = [],
  permissionsPort: PermissionServicePort = permissions(false),
  now: Date = DAY,
) {
  const clock = new FakeClock(now);
  const repo = new FakeCalendarEventRepository(events);
  const service = new CalendarService({
    events: repo,
    permissions: permissionsPort,
    clock,
  });
  return { service, repo, clock };
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

Deno.test("getDay fetches the events of the range of the given day", async () => {
  const { service, repo } = makeService([
    storedEvent(
      "event-1",
      "05 kletshok - Peter",
      at(6, "10:00"),
      at(6, "11:00"),
    ),
  ]);

  await service.getDay(DAY);

  assertEquals(repo.fetches, [getDayRange(DAY)]);
});

Deno.test("getDay without argument fetches today, per the clock", async () => {
  const { service, repo } = makeService([], undefined, DAY);

  await service.getDay();

  assertEquals(repo.fetches.length, 1);
  const range = repo.fetches[0];
  assert(isSameDay(range.start, DAY), "the range starts today");
  assertEquals(range.start.getHours(), 0, "at midnight");
  assert(isSameDay(range.end, DAY), "the range ends today");
  assertEquals(range.end.getHours(), 23, "at the day's end");
});

Deno.test("getDay includes bookings that start the previous day and end on the day", async () => {
  const { service } = makeService([
    // Starts the day before, ends on the queried day: included
    storedEvent(
      "night-before",
      "Kletshok 05 - Peter",
      at(5, "23:00"),
      at(6, "01:00"),
    ),
    // Entirely on the day before: excluded
    storedEvent(
      "day-before",
      "Kletshok 05 - Sanne",
      at(5, "10:00"),
      at(5, "11:00"),
    ),
    // During the queried day: included
    storedEvent(
      "during",
      "Kletshok 05 - Fatima",
      at(6, "10:00"),
      at(6, "11:00"),
    ),
    // Starts on the queried day, ends the next day: included
    storedEvent(
      "night-after",
      "Kletshok 05 - Ozan",
      at(6, "23:00"),
      at(7, "01:00"),
    ),
    // Entirely on the day after: excluded
    storedEvent(
      "day-after",
      "Kletshok 05 - Jorien",
      at(7, "10:00"),
      at(7, "11:00"),
    ),
  ]);

  const rooms = await service.getDay(DAY);
  const bookings = rooms.flatMap((room) => room.bookings);

  assertEquals(
    bookings.map((b) => b.id).sort(),
    ["during", "night-after", "night-before"],
    "only the bookings overlapping the queried day are served",
  );
});

Deno.test("getDay keeps the event's htmlLink on the booking, null when the source has none", async () => {
  const { service } = makeService([
    storedEvent(
      "event-1",
      "05 kletshok - Peter",
      at(6, "10:00"),
      at(6, "11:00"),
      {
        htmlLink: "https://calendar.google.com/calendar/event?eid=abc123",
      },
    ),
    storedEvent(
      "event-2",
      "Stilteruimte - Sanne",
      at(6, "12:00"),
      at(6, "13:00"),
    ),
  ]);

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
  const { service } = makeService([
    storedEvent(
      "blocking-1",
      "C3 workshopruimte Team NYMA makersplaats",
      at(6, "09:00"),
      at(6, "17:00"),
    ),
    storedEvent(
      "event-1",
      "05 kletshok - Peter",
      at(6, "10:00"),
      at(6, "11:00"),
    ),
  ]);

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
  const { service } = makeService([
    storedEvent(
      "inloop-1",
      "Inloopuurtje huurders",
      at(6, "09:00"),
      at(6, "17:00"),
    ),
    storedEvent(
      "bakwagen-1",
      "Bakwagen C3 bezet",
      at(6, "09:00"),
      at(6, "17:00"),
    ),
    storedEvent(
      "event-1",
      "05 kletshok - Peter",
      at(6, "10:00"),
      at(6, "11:00"),
    ),
  ]);

  const rooms = await service.getDay(DAY);

  const bookings = rooms.flatMap((room) => room.bookings);
  assertEquals(bookings.length, 1, "Only the normal event should remain");
  assertEquals(bookings[0].id, "event-1");
});

Deno.test("getDay ignores any summary containing workshopruimte or torenkamer", async () => {
  const { service } = makeService([
    storedEvent(
      "ws-1",
      "Workshopruimte - Peter",
      at(6, "09:00"),
      at(6, "10:00"),
    ),
    storedEvent(
      "tk-1",
      "Torenkamer WT-04 I EV's NYMA",
      at(6, "11:00"),
      at(6, "12:00"),
    ),
    storedEvent(
      "event-1",
      "05 kletshok - Peter",
      at(6, "10:00"),
      at(6, "11:00"),
    ),
  ]);

  const rooms = await service.getDay(DAY);

  const bookings = rooms.flatMap((room) => room.bookings);
  assertEquals(bookings.length, 1, "Only the normal event should remain");
  assertEquals(bookings[0].id, "event-1");
});

Deno.test("getDay groups events per room and routes unmatched ones to Unknown", async () => {
  const { service } = makeService([
    storedEvent(
      "event-1",
      "05 kletshok - Peter",
      at(6, "10:00"),
      at(6, "11:00"),
    ),
    storedEvent("event-2", "Tuinkamer - Sanne", at(6, "12:00"), at(6, "13:00")),
    storedEvent(
      "event-3",
      "Werkplaats overleg - Griet",
      at(6, "14:00"),
      at(6, "15:00"),
    ),
  ]);

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

Deno.test("getDay marks bookings editable exactly when the permission service says so", async () => {
  const events = [
    storedEvent("event-1", "Kletshok 05 - Bèr", at(6, "10:00"), at(6, "11:00")),
    storedEvent(
      "event-2",
      "Kletshok 05 - Sanne",
      at(6, "12:00"),
      at(6, "13:00"),
    ),
  ];

  const editable = await makeService(events, permissions(true)).service.getDay(
    DAY,
  );
  assert(
    editable.flatMap((room) => room.bookings).every((b) => b.editable),
    "all bookings editable when the permission service allows",
  );

  const readOnly = await makeService(events, permissions(false)).service.getDay(
    DAY,
  );
  assert(
    readOnly.flatMap((room) => room.bookings).every((b) => !b.editable),
    "all bookings read-only when the permission service denies",
  );
});

Deno.test("createBooking writes the standardized event format to the repository", async () => {
  const { service, repo } = makeService();

  const booking: NewBooking = {
    room: "Kletshok 03",
    booker: "Bèr",
    contact: "ber@boekjehokje.test",
    start: new Date("2026-10-28T10:00:00Z"),
    end: new Date("2026-10-28T10:55:00Z"),
  };

  const created = await service.createBooking(booking);

  assertEquals(repo.writes.length, 1);
  assertEquals(repo.writes[0].kind, "create");
  assertEquals(repo.writes[0].draft, {
    summary: "KH 03 | Bèr",
    description: "ber@boekjehokje.test",
    start: new Date("2026-10-28T10:00:00Z"),
    end: new Date("2026-10-28T10:55:00Z"),
  });

  // The stored event is parsed back into domain language (round-trip)
  assertEquals(created.id, repo.writes[0].eventId);
  assertEquals(created.room, "Kletshok 03");
  assertEquals(created.booker, "Bèr");
  assertEquals(created.start, new Date("2026-10-28T10:00:00Z"));
  assertEquals(created.end, new Date("2026-10-28T10:55:00Z"));
});

Deno.test("updateBooking stores the standardized event format onto the existing event", async () => {
  const { service, repo } = makeService();

  const update: BookingUpdate = {
    id: "event-1",
    room: "Tuinkamer",
    booker: "Bèr",
    contact: "",
    start: new Date("2026-10-28T12:00:00Z"),
    end: new Date("2026-10-28T13:00:00Z"),
  };

  const updated = await service.updateBooking(update);

  assertEquals(repo.writes, [{
    kind: "update",
    eventId: "event-1",
    draft: {
      summary: "TK | Bèr",
      start: new Date("2026-10-28T12:00:00Z"),
      end: new Date("2026-10-28T13:00:00Z"),
    },
  }]);
  assertEquals(updated.id, "event-1");
  assertEquals(updated.room, "Tuinkamer");
  assertEquals(updated.booker, "Bèr");
});

Deno.test("deleteBooking deletes the event through the repository", async () => {
  const { service, repo } = makeService([
    storedEvent(
      "event-1",
      "05 kletshok - Peter",
      at(6, "10:00"),
      at(6, "11:00"),
    ),
  ]);

  await service.deleteBooking("event-1");

  assertEquals(repo.writes, [{ kind: "delete", eventId: "event-1" }]);
  assertEquals(repo.stored, [], "the event is gone from the repository");
});

Deno.test("write operations propagate repository errors to the caller", async () => {
  const { service, repo } = makeService();
  repo.createEvent = () =>
    Promise.reject(new CalendarApiError("forbidden", 403));

  const booking: NewBooking = {
    room: "Kletshok 03",
    booker: "Bèr",
    contact: "",
    start: new Date("2026-10-28T10:00:00Z"),
    end: new Date("2026-10-28T10:55:00Z"),
  };

  await assertRejects(() => service.createBooking(booking), CalendarApiError);
});
