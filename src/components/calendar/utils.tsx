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
  findOverlaps,
  UNKNOWN_ROOM,
  UNKNOWN_ROOM_DESCRIPTION,
} from "../../services/index.ts";
import { freeSlotBlocks } from "./freeSlots.ts";

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
 * Extra fields every board event carries next to start/end/title.
 * A booking event carries `booking` and `editable`; a free-slot block
 * carries `freeSlot` instead. (super-calendar's event type intersects its
 * own fields with the meta via Omit, which collapses a union meta, so the
 * meta is one interface with optional fields and code guards on them.)
 */
export interface BoardEventMeta {
  /** Room (resource) the event is in */
  resourceId: string;
  /** The domain booking this event represents (booking events only) */
  booking?: Booking;
  /** Whether the current user may edit this booking (ADR-0004) */
  editable?: boolean;
  /** The exact range of a bookable free slot (free-slot blocks only) */
  freeSlot?: { start: Date; end: Date };
  /** The free-slot block currently selected in the open booking form */
  selected?: boolean;
  /** A preview block at the booking form's current draft values */
  preview?: boolean;
  /** Free-slot blocks are disabled while the booking form is open */
  disabled?: boolean;
  /** The event's range overlaps another booking of the room (issue #16): warn, never block */
  conflict?: boolean;
}

/**
 * A calendar event as rendered on the resource timeline
 */
export type BoardEvent = CalendarEvent<BoardEventMeta>;

/**
 * A time/room change applied by dragging an own booking (UI-only,
 * persisting it is the edit UI's job, #13)
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
 * Map the free slots of the rooms on the given day to board events, so the
 * board paints every bookable slot as a green block (ADR-0006). The blocks
 * are not draggable and carry no booking.
 */
export function toFreeSlotEvents(
  rooms: CalendarRoom[],
  day: Date,
  now: Date,
  selected?: { room: string; start: Date; end: Date } | null,
): BoardEvent[] {
  return rooms.flatMap((room) =>
    freeSlotBlocks(room.bookings, day, now).map((slot) => {
      const isSelected = selected !== null && selected !== undefined &&
        selected.room === room.canonicalName &&
        selected.start.getTime() === slot.start.getTime() &&
        selected.end.getTime() === slot.end.getTime();
      const event: BoardEvent = {
        title: "Nu boeken",
        start: slot.start,
        end: slot.end,
        resourceId: room.canonicalName,
        freeSlot: slot,
        selected: isSelected,
        draggable: false,
      };
      return event;
    })
  );
}

/**
 * The draft booking of an open booking form: what the user is currently
 * "inserting"
 */
export interface BookingDraft {
  room: string;
  start: Date;
  end: Date;
}

/**
 * A preview event for the current draft of the booking form, so the board
 * shows what is being booked and where while the form is edited. Returns
 * null when the draft's room is not visible (hidden column) or when the
 * draft still equals the selected slot (that block is already highlighted)
 */
export function toPreviewEvent(
  draft: BookingDraft,
  rooms: CalendarRoom[],
  selected: { room: string; start: Date; end: Date } | null,
): BoardEvent | null {
  if (!rooms.some((room) => room.canonicalName === draft.room)) return null;
  if (
    selected !== null &&
    selected.room === draft.room &&
    selected.start.getTime() === draft.start.getTime() &&
    selected.end.getTime() === draft.end.getTime()
  ) {
    return null;
  }
  return {
    title: "Nu boeken",
    start: draft.start,
    end: draft.end,
    resourceId: draft.room,
    freeSlot: { start: draft.start, end: draft.end },
    preview: true,
    draggable: false,
  };
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
    if (!event.booking) return event;
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
 * Default margin between consecutive bookings in a room, in minutes
 * (ADR-0006): encouraged through defaults and a warning, never enforced
 */
export const MARGIN_MINUTES = 5;

/**
 * A proposed slot shorter than this many minutes is skipped: the proposal
 * runs until five to the next whole hour instead (ADR-0006)
 */
const MIN_PROPOSAL_MINUTES = 30;

/**
 * The default booking slot for a click on empty lane space at `at` in a
 * room with the given bookings (ADR-0006): the slot starts at the whole
 * hour below `at`, or five minutes after the latest preceding booking's
 * end when that is later, and ends five minutes before the first whole
 * hour more than MIN_PROPOSAL_MINUTES after the start
 */
export function defaultSlotAt(
  at: Date,
  bookings: ReadonlyArray<{ start: Date; end: Date }>,
): { start: Date; end: Date } {
  const start = new Date(at);
  start.setMinutes(0, 0, 0);
  for (const booking of bookings) {
    if (booking.end.getTime() <= at.getTime()) {
      const withMargin = booking.end.getTime() + MARGIN_MINUTES * 60_000;
      if (withMargin > start.getTime()) {
        start.setTime(withMargin);
      }
    }
  }
  const end = new Date(start);
  end.setHours(start.getHours() + 1, 0, 0, 0);
  while (end.getTime() - start.getTime() <= MIN_PROPOSAL_MINUTES * 60_000) {
    end.setHours(end.getHours() + 1);
  }
  end.setMinutes(end.getMinutes() - MARGIN_MINUTES);
  return { start, end };
}

/**
 * Bookings longer than this many minutes get a "this is very long"
 * warning in the booking form
 */
export const LONG_BOOKING_MINUTES = 180;

/**
 * Whether a range is longer than LONG_BOOKING_MINUTES
 */
export function isLongBooking(start: Date, end: Date): boolean {
  return end.getTime() - start.getTime() > LONG_BOOKING_MINUTES * 60_000;
}

/**
 * Whether the range is inverted: "Van" must be before "Tot"
 */
export function isInvertedRange(start: Date, end: Date): boolean {
  return end.getTime() <= start.getTime();
}

/**
 * How a proposed range relates to the existing bookings of the room
 * (ADR-0006): a zero-minute gap to an adjacent booking is allowed but
 * warned about. Overlaps are not handled here: they are found with
 * findOverlaps in the domain (issue #16) and only ever warned about,
 * never blocked.
 */
export interface MarginCheck {
  zeroGap: boolean;
}

/**
 * Check a proposed range for a zero-minute gap to an adjacent booking
 */
export function checkMargin(
  bookings: ReadonlyArray<{ start: Date; end: Date }>,
  start: Date,
  end: Date,
): MarginCheck {
  let zeroGap = false;
  for (const booking of bookings) {
    if (
      start.getTime() === booking.end.getTime() ||
      end.getTime() === booking.start.getTime()
    ) {
      zeroGap = true;
    }
  }
  return { zeroGap };
}

/**
 * Mark the events whose range overlaps an existing booking of their room
 * as conflicting (issue #16), so the board shows the conflict in red next
 * to the form warning: booking events that overlap another booking (the
 * double bookings already on the calendar) as well as free-slot blocks
 * (the selected slot and the form's preview) whose range overlaps one.
 * An event never conflicts with its own booking; the booking with
 * `excludeBookingId` (the one being edited) never counts as an overlap.
 */
export function markConflicts(
  events: BoardEvent[],
  rooms: ReadonlyArray<{ canonicalName: string; bookings: Booking[] }>,
  excludeBookingId?: string,
): BoardEvent[] {
  return events.map((event) => {
    if (!event.freeSlot && !event.booking) return event;
    const selfId = event.booking?.id ?? excludeBookingId;
    const overlaps = findOverlaps(
      rooms,
      event.resourceId,
      event.start,
      event.end,
    ).filter((booking) => booking.id !== selfId);
    return overlaps.length > 0 ? { ...event, conflict: true } : event;
  });
}

/**
 * Format a date for a datetime-local input ("yyyy-MM-ddTHH:mm", local
 * time), the inverse of parsing the input's value with `new Date(value)`
 */
export function formatDateTimeLocal(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${
    pad(date.getDate())
  }T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * The summary a new booking will get in the calendar source, shown as a
 * live preview in the booking form: "room short name | booker"
 */
export function summaryPreview(shortName: string, booker: string): string {
  return `${shortName} | ${booker}`;
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
 * Background of a free-slot block: a light, inviting green, clearly
 * distinct from both booking styles
 */
export const FREE_SLOT_BACKGROUND = "rgba(76, 175, 80, 0.16)";

/**
 * Border of a free-slot block
 */
export const FREE_SLOT_BORDER = "rgba(46, 125, 50, 0.55)";

/**
 * Background of the free-slot block selected in the open booking form:
 * clearly stronger than a plain free slot
 */
export const FREE_SLOT_SELECTED_BACKGROUND = "rgba(76, 175, 80, 0.4)";

/**
 * Border of the selected free-slot block: solid and strong
 */
export const FREE_SLOT_SELECTED_BORDER = "rgba(27, 94, 32, 0.9)";

/**
 * Background of the preview block showing the booking form's current
 * draft: outlined, distinct from the selected slot
 */
export const FREE_SLOT_PREVIEW_BACKGROUND = "rgba(76, 175, 80, 0.08)";

/**
 * Border of the preview block
 */
export const FREE_SLOT_PREVIEW_BORDER = "rgba(46, 125, 50, 0.9)";

/**
 * Background of a free-slot block whose range overlaps an existing
 * booking (issue #16): a warning red, clearly distinct from the green
 * free-slot styles
 */
export const FREE_SLOT_CONFLICT_BACKGROUND = "rgba(211, 47, 47, 0.2)";

/**
 * Border of a conflicting free-slot block: solid and strong
 */
export const FREE_SLOT_CONFLICT_BORDER = "rgba(183, 28, 28, 0.9)";

/**
 * Background of a booking event that overlaps another booking of its
 * room (issue #16): a warning red, distinct from the editable green and
 * the read-only grey
 */
export const CONFLICT_EVENT_BACKGROUND = "rgba(211, 47, 47, 0.35)";

/**
 * Border of a conflicting booking event
 */
export const CONFLICT_EVENT_BORDER = "rgba(183, 28, 28, 0.9)";

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
