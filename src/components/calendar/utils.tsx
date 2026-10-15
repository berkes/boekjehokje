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
 * Long description of a room, shown as tooltip
 */
export function roomDescription(room: { canonicalName: string }): string {
  return room.canonicalName === UNKNOWN_ROOM
    ? UNKNOWN_ROOM_DESCRIPTION
    : room.canonicalName;
}

/**
 * Map rooms to calendar columns (resources), with Unknown always last
 */
export function toColumns(rooms: CalendarRoom[]): DayPilotColumn[] {
  return [...rooms]
    .sort((a, b) =>
      a.canonicalName === UNKNOWN_ROOM
        ? 1
        : b.canonicalName === UNKNOWN_ROOM
        ? -1
        : 0
    )
    .map((room) => ({
      id: room.canonicalName,
      name: room.shortName,
      toolTip: roomDescription(room),
    }));
}

/**
 * Map room bookings to calendar events
 */
export function toEvents(rooms: CalendarRoom[]): DayPilotEvent[] {
  return rooms.flatMap((room) =>
    room.bookings.map((booking) => ({
      id: booking.id,
      text: booking.booker || booking.summary,
      start: toDayPilotString(booking.start),
      end: toDayPilotString(booking.end),
      resource: room.canonicalName,
      toolTip: booking.summary,
    }))
  );
}
