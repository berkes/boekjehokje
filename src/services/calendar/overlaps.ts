/**
 * Overlap detection between a candidate booking and existing bookings
 *
 * Pure domain logic (issue #16): given the rooms with their bookings and
 * a candidate time range in one room, find the existing bookings of that
 * room the range overlaps. The booking form uses it to warn about double
 * bookings before confirming; the board uses it to mark conflicting slots.
 * Per ADR-0002 the app guides visually and never blocks: an overlap is
 * reported, the user stays free to book anyway.
 */

import type { Booking, Room } from "./CalendarServicePort.ts";

/**
 * The room shape overlap detection needs: a canonical name and bookings
 */
export type RoomWithBookings = Pick<Room, "canonicalName" | "bookings">;

/**
 * Whether the candidate range [start, end) overlaps the booking's range.
 * Touching ranges (a zero-minute gap) do not overlap.
 */
export function rangesOverlap(
  start: Date,
  end: Date,
  booking: { start: Date; end: Date },
): boolean {
  return start.getTime() < booking.end.getTime() &&
    end.getTime() > booking.start.getTime();
}

/**
 * The bookings of the given room that the candidate range [start, end)
 * overlaps, sorted by start time. An inverted or empty range, or an
 * unknown room, overlaps nothing.
 */
export function findOverlaps(
  rooms: ReadonlyArray<RoomWithBookings>,
  room: string,
  start: Date,
  end: Date,
): Booking[] {
  if (end.getTime() <= start.getTime()) return [];
  const target = rooms.find((r) => r.canonicalName === room);
  if (!target) return [];
  return target.bookings
    .filter((booking) => rangesOverlap(start, end, booking))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}
