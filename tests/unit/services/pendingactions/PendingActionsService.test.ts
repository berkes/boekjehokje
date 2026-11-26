/**
 * Unit tests for the pending actions service (issue #36)
 *
 * The service is tested through its public interface (the
 * PendingActionsPort) with the central fakes from tests/utils: the real
 * calendar service over a FakeCalendarEventRepository, a RoomsService
 * and a FakeTimer, so the undo delay is fired manually. A failing write
 * is tested with a small inline calendar stub.
 */

import { assert, assertEquals } from "@std/assert";
import { buildTestServices, FakeTimer } from "../../../utils/index.ts";
import type {
  Booking,
  CalendarServicePort,
  NewBooking,
  PendingActionEvent,
} from "../../../../src/services/index.ts";
import {
  DEFAULT_PENDING_ACTION_DELAY_MS,
  PendingActionsService,
} from "../../../../src/services/pendingactions/index.ts";
import { RoomsService } from "../../../../src/services/rooms/index.ts";

/**
 * A local date-time on 2026-10-<day> at "hh:mm", so the bookings land on
 * local days whatever the test runner's timezone
 */
function at(day: number, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return new Date(2026, 9, day, hours, minutes);
}

/** Flush the micro- and macrotask queues, so performed writes settle */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function newBooking(overrides: Partial<NewBooking> = {}): NewBooking {
  return {
    room: "Kletshok 04",
    booker: "Bèr",
    contact: "ber@boekjehokje.test",
    start: at(6, "10:00"),
    end: at(6, "10:55"),
    ...overrides,
  };
}

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "event-1",
    uid: "event-1@example.com",
    summary: "SR | Bèr",
    htmlLink: null,
    room: "Stilteruimte",
    booker: "Bèr",
    editable: true,
    details: { originalName: "SR | Bèr", author: "ber@boekjehokje.test" },
    start: at(6, "11:00"),
    end: at(6, "14:00"),
    ...overrides,
  };
}

Deno.test("queueCreate emits queued, writes nothing yet and schedules the 30 second delay", () => {
  const { services, fakes } = buildTestServices();
  const events: PendingActionEvent[] = [];
  services.pendingActions.subscribe((event) => events.push(event));

  const action = services.pendingActions.queueCreate(newBooking());

  assertEquals(action.kind, "create");
  assertEquals(action.label, "04 KH");
  assertEquals(events.map((event) => event.type), ["queued"]);
  assertEquals(services.pendingActions.pending().map((a) => a.id), [
    action.id,
  ]);
  assertEquals(fakes.events.writes, []);
  assertEquals(fakes.timer.scheduledDelays(), [
    DEFAULT_PENDING_ACTION_DELAY_MS,
  ]);
  assertEquals(DEFAULT_PENDING_ACTION_DELAY_MS, 30_000);
});

Deno.test("a queued create is written after the delay and emits performed", async () => {
  const { services, fakes } = buildTestServices();
  const events: PendingActionEvent[] = [];
  services.pendingActions.subscribe((event) => events.push(event));

  services.pendingActions.queueCreate(newBooking());
  fakes.timer.runAll();
  await tick();

  assertEquals(fakes.events.writes.map((write) => write.kind), ["create"]);
  assertEquals(
    fakes.events.writes[0].draft?.summary,
    "04 KH | Bèr",
  );
  assertEquals(events.map((event) => event.type), ["queued", "performed"]);
  assertEquals(services.pendingActions.pending(), []);
});

Deno.test("a queued update and delete are written after the delay", async () => {
  const { services, fakes } = buildTestServices();

  services.pendingActions.queueUpdate({
    ...newBooking({ room: "Stilteruimte" }),
    id: "event-1",
  });
  services.pendingActions.queueDelete(booking());
  assertEquals(
    services.pendingActions.pending().map((action) => action.kind),
    ["update", "delete"],
  );
  assertEquals(
    services.pendingActions.pending().map((action) => action.label),
    ["SR", "SR"],
  );

  fakes.timer.runAll();
  await tick();

  assertEquals(
    fakes.events.writes.map((write) => [write.kind, write.eventId]),
    [["update", "event-1"], ["delete", "event-1"]],
  );
  assertEquals(services.pendingActions.pending(), []);
});

Deno.test("cancelAll cancels every pending action and nothing is written after the delay", async () => {
  const { services, fakes } = buildTestServices();
  const events: PendingActionEvent[] = [];
  services.pendingActions.subscribe((event) => events.push(event));

  services.pendingActions.queueCreate(newBooking());
  services.pendingActions.queueDelete(booking());
  services.pendingActions.cancelAll();

  assertEquals(
    events.map((event) => event.type),
    ["queued", "queued", "cancelled", "cancelled"],
  );
  assertEquals(services.pendingActions.pending(), []);
  assertEquals(fakes.timer.scheduledCount, 0);

  fakes.timer.runAll();
  await tick();
  assertEquals(fakes.events.writes, []);
  assertEquals(
    events.map((event) => event.type),
    ["queued", "queued", "cancelled", "cancelled"],
  );
});

Deno.test("a write that throws emits failed with the error and leaves the queue", async () => {
  const timer = new FakeTimer();
  const failingCalendar: CalendarServicePort = {
    getDay: () => Promise.resolve([]),
    createBooking: () => Promise.reject(new Error("kalender kapot")),
    updateBooking: () => Promise.reject(new Error("kalender kapot")),
    deleteBooking: () => Promise.reject(new Error("kalender kapot")),
  };
  const service = new PendingActionsService({
    calendar: failingCalendar,
    rooms: new RoomsService(),
    timer,
  });
  const events: PendingActionEvent[] = [];
  service.subscribe((event) => events.push(event));

  service.queueCreate(newBooking());
  timer.runAll();
  await tick();

  assertEquals(events.map((event) => event.type), ["queued", "failed"]);
  const failed = events[1];
  assert(failed.type === "failed");
  assert(failed.error instanceof Error);
  assertEquals(failed.error.message, "kalender kapot");
  assertEquals(service.pending(), []);
});

Deno.test("the delay is configurable through the dependencies", () => {
  const timer = new FakeTimer();
  const { services } = buildTestServices();
  const service = new PendingActionsService({
    calendar: services.calendar,
    rooms: new RoomsService(),
    timer,
    delayMs: 5_000,
  });

  service.queueCreate(newBooking());

  assertEquals(timer.scheduledDelays(), [5_000]);
});

Deno.test("unsubscribing stops the events", () => {
  const { services } = buildTestServices();
  const events: PendingActionEvent[] = [];
  const unsubscribe = services.pendingActions.subscribe((event) =>
    events.push(event)
  );

  services.pendingActions.queueCreate(newBooking());
  unsubscribe();
  services.pendingActions.queueCreate(newBooking());

  assertEquals(events.map((event) => event.type), ["queued"]);
});
