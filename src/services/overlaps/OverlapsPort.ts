/**
 * Overlaps port (input port of the overlaps service)
 *
 * Overlap detection between a candidate booking and existing bookings
 * (issue #16): pure domain logic. Given the rooms with their bookings and
 * a candidate time range in one room, find the existing bookings of that
 * room the range overlaps. Per ADR-0002 the app guides visually and never
 * blocks: an overlap is reported, the user stays free to book anyway.
 */

import type { Booking, Room } from "../calendar/CalendarServicePort.ts";

/**
 * The room shape overlap detection needs: a canonical name and bookings
 */
export type RoomWithBookings = Pick<Room, "canonicalName" | "bookings">;

/**
 * The port every overlaps service must implement
 */
export interface OverlapsPort {
  /**
   * Whether the candidate range [start, end) overlaps the booking's range.
   * Touching ranges (a zero-minute gap) do not overlap.
   */
  rangesOverlap(
    start: Date,
    end: Date,
    booking: { start: Date; end: Date },
  ): boolean;

  /**
   * The bookings of the given room that the candidate range [start, end)
   * overlaps, sorted by start time. An inverted or empty range, or an
   * unknown room, overlaps nothing.
   */
  findOverlaps(
    rooms: ReadonlyArray<RoomWithBookings>,
    room: string,
    start: Date,
    end: Date,
  ): Booking[];
}
