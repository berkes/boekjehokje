/**
 * Integration tests: calendar service + permission service
 *
 * Two real services (CalendarService and PermissionService) composed over
 * the central fakes from tests/utils, testing their interaction through
 * the public interfaces: getDay asks the permission service to mark the
 * editable bookings (ADR-0004). Interactions of more than two services are
 * covered by the E2E suite, not here.
 */

import { assert, assertEquals } from "@std/assert";
import { buildTestServices, fakeUser, storedEvent } from "../utils/index.ts";
import type { StoredEvent } from "../../src/services/calendar/index.ts";

/** Tuesday 6 October 2026, midday local */
const DAY = new Date(2026, 9, 6, 12, 0);

function at(day: number, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return new Date(2026, 9, day, hours, minutes);
}

function ownEvent(id: string): StoredEvent {
  // Creator email differs in case from the profile email on purpose:
  // the comparison is case-insensitive (ADR-0004)
  return storedEvent(id, "Kletshok 05 - Bèr", at(6, "10:00"), at(6, "11:00"), {
    creatorEmail: "BER@boekjehokje.test",
  });
}

function otherEvent(id: string): StoredEvent {
  return storedEvent(
    id,
    "Kletshok 05 - Sanne",
    at(6, "12:00"),
    at(6, "13:00"),
    {
      creatorEmail: "sanne@example.com",
    },
  );
}

Deno.test("getDay marks the current user's bookings editable and others read-only", async () => {
  const { services } = buildTestServices({
    user: fakeUser,
    events: [ownEvent("event-1"), otherEvent("event-2")],
    now: DAY,
  });

  const rooms = await services.calendar.getDay(DAY);
  const bookings = rooms.flatMap((room) => room.bookings);

  const own = bookings.find((b) => b.id === "event-1");
  const other = bookings.find((b) => b.id === "event-2");
  assert(own, "own booking should be present");
  assert(other, "other booking should be present");
  assert(own.editable, "booking created by the current user is editable");
  assert(!other.editable, "booking created by someone else is read-only");
  assertEquals(own.details.author, "BER@boekjehokje.test");
});

Deno.test("getDay marks all bookings read-only when signed out", async () => {
  const { services } = buildTestServices({
    user: null,
    events: [ownEvent("event-1")],
    now: DAY,
  });

  const rooms = await services.calendar.getDay(DAY);
  const bookings = rooms.flatMap((room) => room.bookings);

  assertEquals(bookings.length, 1);
  assert(!bookings[0].editable, "without a session nothing is editable");
});

Deno.test("createBooking returns the stored booking as editable for the current user", async () => {
  const { services } = buildTestServices({ user: fakeUser, now: DAY });

  // The fake repository echoes writes back with the current user as
  // creator, like the calendar source does after its write
  const created = await services.calendar.createBooking({
    room: "Kletshok 03",
    booker: fakeUser.name,
    contact: "ber@boekjehokje.test",
    start: new Date("2026-10-28T10:00:00Z"),
    end: new Date("2026-10-28T10:55:00Z"),
  });

  assertEquals(created.room, "Kletshok 03");
  assertEquals(created.booker, fakeUser.name);
  assert(created.editable, "the current user's own booking is editable");
});

Deno.test("createBooking returns a read-only booking when signed out", async () => {
  const { services } = buildTestServices({ user: null, now: DAY });

  const created = await services.calendar.createBooking({
    room: "Kletshok 03",
    booker: "Anoniem",
    contact: "",
    start: new Date("2026-10-28T10:00:00Z"),
    end: new Date("2026-10-28T10:55:00Z"),
  });

  assert(!created.editable);
});
