/**
 * Utilities for translating between our domain and super-calendar
 *
 * Helper functions used by the Calendar component (the actual
 * super-calendar wrapper) to translate the domain model (Room[], Booking[])
 * into the shapes @super-calendar/dom expects: resource lanes, board events
 * and theme tokens.
 *
 * Pure functions only, so they are unit-testable without rendering the
 * third-party component.
 */
import type {
  CalendarEvent,
  DomCalendarTheme,
  Resource,
} from "@super-calendar/dom";
import {
  type Booking,
  UNKNOWN_ROOM,
  UNKNOWN_ROOM_DESCRIPTION,
} from "../../services/index.ts";

/**
 * A resource lane on the board: a room, with the description for the
 * column header
 */
export interface CalendarResource extends Resource {
  /** Full room description, shown as header subtitle and tooltip */
  description: string;
}

/**
 * Whether the library handed us back one of our own resources, which
 * carries the room description
 */
export function isCalendarResource(
  resource: Resource,
): resource is CalendarResource {
  return "description" in resource &&
    typeof resource.description === "string";
}

/**
 * Extra fields every board event carries next to start/end/title,
 * so callbacks can find the domain booking back.
 */
export interface BookingEventMeta {
  /** The domain booking this event represents */
  booking: Booking;
  /** Whether the current user may edit this booking (ADR-0004) */
  editable: boolean;
  /** Room (resource) the booking is in */
  resourceId: string;
}

/**
 * A calendar event as rendered on the resource timeline
 */
export type BoardEvent = CalendarEvent<BookingEventMeta>;

/**
 * A time/room change applied by dragging an own booking (UI-only,
 * persistence is issue #14)
 */
export interface MovedEvent {
  start: Date;
  end: Date;
  resourceId: string;
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
 * Map rooms to resource timeline lanes, with Unknown always last.
 * The header shows the short name in bold with the full description
 * (canonical name) as subtitle and tooltip.
 */
export function toResources(rooms: CalendarRoom[]): CalendarResource[] {
  return withUnknownLast(rooms).map((room) => ({
    id: room.canonicalName,
    title: room.shortName,
    description: roomDescription(room),
  }));
}

/**
 * Map room bookings to board events. The booking itself travels along in
 * the meta; its editability was decided by the calendar service (ADR-0004)
 * and events of others are locked (draggable: false).
 */
export function toEvents(rooms: CalendarRoom[]): BoardEvent[] {
  return rooms.flatMap((room) =>
    room.bookings.map((booking) => {
      const editable = booking.editable;

      const event: BoardEvent = {
        title: booking.booker || booking.summary,
        start: booking.start,
        end: booking.end,
        resourceId: room.canonicalName,
        booking,
        editable,
        draggable: editable,
      };

      return event;
    })
  );
}

/**
 * Apply locally dragged time/room changes over the mapped events.
 * An override replaces the booking's original start, end and room, so the
 * board shows the user's drag even though Google Calendar is not updated.
 */
export function applyMovedEvents(
  events: BoardEvent[],
  moved: ReadonlyMap<string, MovedEvent>,
): BoardEvent[] {
  if (moved.size === 0) return events;
  return events.map((event) => {
    const override = moved.get(event.booking.id);
    if (!override) return event;
    return {
      ...event,
      start: override.start,
      end: override.end,
      resourceId: override.resourceId,
    };
  });
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

/**
 * Background of events the current user may not edit (issue #13):
 * low-emphasis grey, like MUI's disabled surfaces
 */
export const READ_ONLY_EVENT_BACKGROUND = "rgba(0, 0, 0, 0.08)";

/**
 * Border of events the current user may not edit
 */
export const READ_ONLY_EVENT_BORDER = "rgba(0, 0, 0, 0.2)";

/**
 * Background of events the current user may edit: light green
 */
export const EDITABLE_EVENT_BACKGROUND = "rgba(76, 175, 80, 0.5)";

/**
 * Minimal MUI palette shape needed to theme the board
 */
export interface MuiPaletteLike {
  secondary: { main: string };
  divider: string;
  text: { primary: string; secondary: string; disabled: string };
}

/**
 * Map the MUI palette onto super-calendar's dom theme tokens, so the
 * board follows the app theme without custom CSS (ADR-0005).
 */
export function toDomTheme(
  palette: MuiPaletteLike,
): Partial<DomCalendarTheme> {
  return {
    gridLine: palette.divider,
    text: palette.text.primary,
    textMuted: palette.text.secondary,
    textDisabled: palette.text.disabled,
    nowIndicator: palette.secondary.main,
    eventBackground: READ_ONLY_EVENT_BACKGROUND,
    eventText: palette.text.primary,
  };
}
