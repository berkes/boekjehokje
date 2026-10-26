/**
 * Utilities for translating between our domain and DayPilot
 *
 * Helper functions used by the Calendar component (the actual DayPilot
 * wrapper) to translate the domain model (Room[], Booking[]) and plain
 * Date objects into the shapes DayPilot expects: resource columns,
 * calendar events and timezone-less local date strings.
 *
 * Pure functions only, so they are unit-testable without rendering the
 * third-party component.
 */
import {
  type Booking,
  isEditable,
  UNKNOWN_ROOM,
  UNKNOWN_ROOM_DESCRIPTION,
} from "../../services/index.ts";

/**
 * DayPilot resource column shape
 */
export interface DayPilotColumn {
  id: string;
  name: string;
  toolTip: string;
}

/**
 * DayPilot calendar event shape
 */
export interface DayPilotEvent {
  id: string;
  text: string;
  start: string;
  end: string;
  resource: string;
  toolTip: string;
  editable: boolean;
}

/**
 * Minimal room shape needed for the calendar view
 */
export interface CalendarRoom {
  canonicalName: string;
  shortName: string;
  bookings: Booking[];
}

/**
 * Convert a Date to a DayPilot-compatible ISO string.
 * DayPilot interprets date strings without timezone suffix as local time.
 */
export function toDayPilotString(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${
      pad(
        date.getSeconds(),
      )
    }`
  );
}

/**
 * Whether this is the special Unknown room
 */
export function isUnknownRoom(room: { canonicalName: string }): boolean {
  return room.canonicalName === UNKNOWN_ROOM;
}

/**
 * Long description of a room, shown as tooltip
 */
export function roomDescription(room: { canonicalName: string }): string {
  return isUnknownRoom(room) ? UNKNOWN_ROOM_DESCRIPTION : room.canonicalName;
}

/**
 * Label of a room column: the full canonical name, except for the
 * Unknown room whose description is too long for a label
 */
export function roomLabel(
  room: { canonicalName: string; shortName: string },
): string {
  return isUnknownRoom(room) ? room.shortName : room.canonicalName;
}

/**
 * Rooms in display order: the Unknown room always last
 */
export function withUnknownLast(rooms: CalendarRoom[]): CalendarRoom[] {
  return [...rooms].sort((a, b) =>
    isUnknownRoom(a) ? 1 : isUnknownRoom(b) ? -1 : 0
  );
}

/**
 * Map rooms to calendar columns (resources), with Unknown always last
 */
export function toColumns(rooms: CalendarRoom[]): DayPilotColumn[] {
  return withUnknownLast(rooms).map((room) => ({
    id: room.canonicalName,
    name: room.shortName,
    toolTip: roomDescription(room),
  }));
}

/**
 * CSS class applied to events the current user may not edit, so they are
 * visually distinct from the user's own bookings (issue #13)
 */
export const READ_ONLY_EVENT_CSS_CLASS = "event_read-only";

/**
 * Map room bookings to calendar events. Bookings that are not editable by
 * the given user get the read-only CSS class so they look distinct.
 */
export function toEvents(
  rooms: CalendarRoom[],
  profile?: { email: string } | null,
): DayPilotEvent[] {
  return rooms.flatMap((room) =>
    room.bookings.map((booking) => {
      const editable = isEditable(booking, profile);

      const event: DayPilotEvent = {
        id: booking.id,
        text: booking.booker || booking.summary,
        start: toDayPilotString(booking.start),
        end: toDayPilotString(booking.end),
        resource: room.canonicalName,
        toolTip: booking.summary,
        editable: editable,
      };

      return event;
    })
  );
}

/**
 * Find a booking by id across all rooms
 */
export function findBooking(
  rooms: CalendarRoom[],
  id: string,
): Booking | null {
  for (const room of rooms) {
    const booking = room.bookings.find((b) => b.id === id);
    if (booking) return booking;
  }
  return null;
}
