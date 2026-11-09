/**
 * Free-slot blocks for the board
 *
 * Computes the bookable free slots of a room as 55-minute blocks, following
 * ADR-0006: blocks that follow a booking start five minutes after its end,
 * blocks that precede a booking end five minutes before its start, and a
 * free range spanning multiple hours is presented as multiple blocks.
 * Blocks only exist within business hours.
 *
 * Pure functions, so they are unit-testable without rendering the board.
 */
import { MARGIN_MINUTES } from "./board.ts";

/**
 * Business hours of the makersplaats: free-slot blocks only exist within
 * this window of the day
 */
export const BUSINESS_START_HOUR = 8;
export const BUSINESS_END_HOUR = 18;

/**
 * Length of one bookable free-slot block in minutes (ADR-0006): 55, so
 * consecutive blocks have a five-minute gap between them
 */
export const SLOT_BLOCK_MINUTES = 55;

/**
 * A bookable free slot on the board
 */
export interface FreeSlot {
  start: Date;
  end: Date;
}

/**
 * A booking-like range, as far as free-slot computation is concerned
 */
export interface BookedRange {
  start: Date;
  end: Date;
}

/**
 * The business-hours window of the given day
 */
export function businessHoursWindow(day: Date): { start: Date; end: Date } {
  const start = new Date(day);
  start.setHours(BUSINESS_START_HOUR, 0, 0, 0);
  const end = new Date(day);
  end.setHours(BUSINESS_END_HOUR, 0, 0, 0);
  return { start, end };
}

/**
 * Emit 55-minute blocks covering [from, to): the first block starts at
 * `from`, each next block starts one hour later, and a block is emitted
 * only while it fits entirely within `to`
 */
function emitBlocks(from: number, to: number, out: FreeSlot[]): void {
  const blockMs = SLOT_BLOCK_MINUTES * 60_000;
  const strideMs = 60 * 60_000;
  for (let s = from; s + blockMs <= to; s += strideMs) {
    out.push({ start: new Date(s), end: new Date(s + blockMs) });
  }
}

/**
 * The bookable free-slot blocks of a room on the given day, within
 * business hours and with a five-minute margin around every booking
 * (ADR-0006). Blocks that end at or before `now` are past slots and do
 * not render
 */
export function freeSlotBlocks(
  bookings: ReadonlyArray<BookedRange>,
  day: Date,
  now: Date,
): FreeSlot[] {
  const window = businessHoursWindow(day);
  const marginMs = MARGIN_MINUTES * 60_000;

  // Clip bookings to the business-hours window, merge overlaps, sort
  const clipped = bookings
    .map((b) => ({
      start: Math.max(b.start.getTime(), window.start.getTime()),
      end: Math.min(b.end.getTime(), window.end.getTime()),
    }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const b of clipped) {
    const last = merged[merged.length - 1];
    if (last && b.start <= last.end) {
      last.end = Math.max(last.end, b.end);
    } else {
      merged.push({ ...b });
    }
  }

  // Walk the window; every gap between bookings is a free interval with a
  // five-minute margin on the booking side
  const out: FreeSlot[] = [];
  let cursor = window.start.getTime();
  for (const b of merged) {
    emitBlocks(cursor, b.start - marginMs, out);
    cursor = Math.max(cursor, b.end + marginMs);
  }
  emitBlocks(cursor, window.end.getTime(), out);
  const nowMs = now.getTime();
  return out.filter((slot) => slot.end.getTime() > nowMs);
}
