/**
 * The standardized calendar event format, write side
 *
 * bookingToEvent serializes a booking into the EventDraft the calendar
 * event repository port accepts: the summary is "room short name |
 * booker" (the same format the booking form previews), so parsing the
 * written event yields the same room and booker; the contact goes into
 * the description. This is the inverse of the parser's parseEvent, and the
 * round-trip is unit tested.
 */

import type { EventDraft } from "./CalendarEventRepositoryPort.ts";
import type { BookingEventSource } from "./CalendarServicePort.ts";
import { ROOMS } from "./rooms.ts";

/**
 * Serialize a booking into the standardized event format: the inverse of
 * the parser's parseEvent.
 */
export function bookingToEvent(booking: BookingEventSource): EventDraft {
  const room = ROOMS.find((r) => r.canonicalName === booking.room);
  const shortName = room?.shortName ?? booking.room;
  const summary = `${shortName} | ${booking.booker}`;

  const event: EventDraft = {
    summary,
    start: booking.start,
    end: booking.end,
  };

  const contact = booking.contact?.trim();
  if (contact) {
    event.description = contact;
  }

  return event;
}
