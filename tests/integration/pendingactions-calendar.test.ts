/**
 * Integration tests: pending actions service + calendar service
 *
 * Two real services (PendingActionsService and CalendarService) composed
 * over the central fakes from tests/utils, testing their interaction
 * through the public interfaces (issue #36): a queued write is performed
 * through the calendar service after the (faked) delay, so it lands in
 * the event repository and shows up in getDay; an undone action never
 * reaches the repository.
 */

import { assertEquals } from "@std/assert";
import { buildTestServices, storedEvent } from "../utils/index.ts";
import type { PendingActionEvent } from "../../src/services/index.ts";

/** Tuesday 6 October 2026, midday local */
const DAY = new Date(2026, 9, 6, 12, 0);

function at(day: number, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return new Date(2026, 9, day, hours, minutes);
}

/** Flush the task queue, so the performed write settles */
function tick(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

Deno.test("a queued create is stored by the calendar service after the delay and shows up in getDay", async () => {
  const { services, fakes } = buildTestServices({ now: DAY });
  const events: PendingActionEvent[] = [];
  services.pendingActions.subscribe((event) => events.push(event));

  services.pendingActions.queueCreate({
    room: "Kletshok 04",
    booker: "Bèr",
    contact: "ber@boekjehokje.test",
    start: at(6, "10:00"),
    end: at(6, "10:55"),
  });

  let rooms = await services.calendar.getDay(DAY);
  assertEquals(
    rooms.find((room) => room.canonicalName === "Kletshok 04")?.bookings,
    [],
  );

  fakes.timer.runAll();
  await tick();

  assertEquals(events.map((event) => event.type), ["queued", "performed"]);
  rooms = await services.calendar.getDay(DAY);
  const created = rooms.find((room) => room.canonicalName === "Kletshok 04")
    ?.bookings;
  assertEquals(created?.map((b) => b.summary), ["04 KH | Bèr"]);
  assertEquals(created?.map((b) => b.editable), [true]);
});

Deno.test("a queued delete removes the event after the delay; an undone delete keeps it", async () => {
  const existing = storedEvent(
    "event-1",
    "SR | Bèr",
    at(6, "11:00"),
    at(6, "14:00"),
    { creatorEmail: "ber@boekjehokje.test" },
  );
  const { services, fakes } = buildTestServices({
    now: DAY,
    events: [existing],
  });

  const booking = (await services.calendar.getDay(DAY))
    .find((room) => room.canonicalName === "Stilteruimte")?.bookings[0];

  services.pendingActions.queueDelete(booking!);
  services.pendingActions.cancelAll();
  fakes.timer.runAll();
  await tick();

  assertEquals(fakes.events.writes, []);
  const rooms = await services.calendar.getDay(DAY);
  assertEquals(
    rooms.find((room) => room.canonicalName === "Stilteruimte")?.bookings
      .map((b) => b.id),
    ["event-1"],
  );

  services.pendingActions.queueDelete(booking!);
  fakes.timer.runAll();
  await tick();

  assertEquals(fakes.events.writes.map((write) => write.kind), ["delete"]);
  const after = await services.calendar.getDay(DAY);
  assertEquals(
    after.find((room) => room.canonicalName === "Stilteruimte")?.bookings,
    [],
  );
});
