/**
 * Unit tests for the free-slot block computation
 *
 * Verifies ADR-0006 on the board: 55-minute blocks within business hours
 * (08:00-18:00), starting five minutes after a preceding booking and
 * ending five minutes before a following one, with multi-hour free ranges
 * split into multiple blocks.
 */
import { assertEquals } from "@std/assert";
import {
  BUSINESS_END_HOUR,
  BUSINESS_START_HOUR,
  freeSlotBlocks,
  SLOT_BLOCK_MINUTES,
} from "../freeSlots.ts";

const DAY = new Date(2026, 9, 28, 12, 0, 0); // Wednesday 28 October 2026

function at(hours: number, minutes = 0): Date {
  return new Date(2026, 9, 28, hours, minutes, 0, 0);
}

function ranges(slots: { start: Date; end: Date }[]): string[] {
  return slots.map((s) =>
    `${s.start.getHours()}:${
      String(s.start.getMinutes()).padStart(2, "0")
    }-${s.end.getHours()}:${String(s.end.getMinutes()).padStart(2, "0")}`
  );
}

Deno.test("freeSlotBlocks of an empty room covers business hours in 55-minute blocks", () => {
  const slots = freeSlotBlocks([], DAY, at(0));

  assertEquals(SLOT_BLOCK_MINUTES, 55);
  assertEquals(BUSINESS_START_HOUR, 8);
  assertEquals(BUSINESS_END_HOUR, 18);
  assertEquals(ranges(slots), [
    "8:00-8:55",
    "9:00-9:55",
    "10:00-10:55",
    "11:00-11:55",
    "12:00-12:55",
    "13:00-13:55",
    "14:00-14:55",
    "15:00-15:55",
    "16:00-16:55",
    "17:00-17:55",
  ]);
});

Deno.test("a free range spanning multiple hours splits into multiple 55-minute blocks", () => {
  // room free from 10:00 (a booking ending at 9:55 leaves the next block
  // at 10:00) -> 8 blocks of 55 minutes until 18:00
  const slots = freeSlotBlocks([{ start: at(8), end: at(9, 55) }], DAY, at(0));

  assertEquals(ranges(slots), [
    "10:00-10:55",
    "11:00-11:55",
    "12:00-12:55",
    "13:00-13:55",
    "14:00-14:55",
    "15:00-15:55",
    "16:00-16:55",
    "17:00-17:55",
  ]);
});

Deno.test("blocks before a booking end five minutes before its start", () => {
  const slots = freeSlotBlocks([{ start: at(11), end: at(13) }], DAY, at(0));

  assertEquals(ranges(slots.slice(0, 3)), [
    "8:00-8:55",
    "9:00-9:55",
    "10:00-10:55",
  ]);
  assertEquals(slots[2].end, at(10, 55));
});

Deno.test("blocks after a booking start five minutes after its end", () => {
  const slots = freeSlotBlocks([{ start: at(11), end: at(13) }], DAY, at(0));

  assertEquals(slots[3].start, at(13, 5));
  assertEquals(ranges(slots.slice(3)), [
    "13:05-14:00",
    "14:05-15:00",
    "15:05-16:00",
    "16:05-17:00",
    "17:05-18:00",
  ]);
});

Deno.test("overlapping bookings are merged into one gap", () => {
  const slots = freeSlotBlocks(
    [
      { start: at(10), end: at(12) },
      { start: at(11), end: at(13) },
    ],
    DAY,
    at(0),
  );

  assertEquals(ranges(slots), [
    "8:00-8:55",
    "9:00-9:55",
    "13:05-14:00",
    "14:05-15:00",
    "15:05-16:00",
    "16:05-17:00",
    "17:05-18:00",
  ]);
});

Deno.test("bookings outside business hours produce no margin gap", () => {
  const slots = freeSlotBlocks([{ start: at(6), end: at(9) }], DAY, at(0));

  assertEquals(ranges(slots), [
    "9:05-10:00",
    "10:05-11:00",
    "11:05-12:00",
    "12:05-13:00",
    "13:05-14:00",
    "14:05-15:00",
    "15:05-16:00",
    "16:05-17:00",
    "17:05-18:00",
  ]);
});

Deno.test("a free gap shorter than 55 minutes after the margin yields no block", () => {
  // booking 10:00-10:30: free gap before it is 8:00-9:55 (blocks), after it
  // 10:35-...; but a booking 10:00-11:00 leaves only 9:55? no: use a gap of
  // 30 minutes between two bookings: 10:00-10:30 and 11:00-12:00 -> the
  // 10:35-10:55 gap fits no block
  const slots = freeSlotBlocks(
    [
      { start: at(10), end: at(10, 30) },
      { start: at(11), end: at(12) },
    ],
    DAY,
    at(0),
  );

  assertEquals(
    ranges(slots).includes("10:35-11:30"),
    false,
  );
  assertEquals(ranges(slots), [
    "8:00-8:55",
    "9:00-9:55",
    "12:05-13:00",
    "13:05-14:00",
    "14:05-15:00",
    "15:05-16:00",
    "16:05-17:00",
    "17:05-18:00",
  ]);
});

Deno.test("free-slot blocks that end at or before now do not render", () => {
  // now = 10:00: the 08:00 and 09:00 blocks are past, the 10:00 block is not
  const slots = freeSlotBlocks([], DAY, at(10));

  assertEquals(ranges(slots), [
    "10:00-10:55",
    "11:00-11:55",
    "12:00-12:55",
    "13:00-13:55",
    "14:00-14:55",
    "15:00-15:55",
    "16:00-16:55",
    "17:00-17:55",
  ]);
});

Deno.test("freeSlotBlocks does not mutate the bookings", () => {
  const bookings = [{ start: at(11), end: at(13) }];
  freeSlotBlocks(bookings, DAY, at(0));

  assertEquals(bookings, [{ start: at(11), end: at(13) }]);
});
