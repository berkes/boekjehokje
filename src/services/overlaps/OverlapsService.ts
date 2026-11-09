/**
 * Overlaps service
 *
 * Implements the OverlapsPort with pure functions: no state, no
 * dependencies — the rooms and candidate range are passed in as arguments
 * on every call.
 */

import type { Booking } from "../calendar/CalendarServicePort.ts";
import type { OverlapsPort, RoomWithBookings } from "./OverlapsPort.ts";

/**
 * Overlaps service
 */
export class OverlapsService implements OverlapsPort {
  /**
   * Whether the candidate range [start, end) overlaps the booking's range.
   * Touching ranges (a zero-minute gap) do not overlap.
   */
  rangesOverlap(
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
  findOverlaps(
    rooms: ReadonlyArray<RoomWithBookings>,
    room: string,
    start: Date,
    end: Date,
  ): Booking[] {
    if (end.getTime() <= start.getTime()) return [];
    const target = rooms.find((r) => r.canonicalName === room);
    if (!target) return [];
    return target.bookings
      .filter((booking) => this.rangesOverlap(start, end, booking))
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }
}
