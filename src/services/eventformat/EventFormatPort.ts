/**
 * Event format port (input port of the event format service)
 *
 * The standardized calendar event format, both directions, in domain
 * language: parse reads a stored event's summary into room and booker,
 * serialize writes a booking into an event draft. parse is the inverse of
 * serialize; the round-trip is unit tested.
 */

import type {
  EventDraft,
  StoredEvent,
} from "../calendar/CalendarEventRepositoryPort.ts";
import type { BookingEventSource } from "../calendar/CalendarServicePort.ts";

/**
 * A stored event parsed into domain language: the room and booker
 * extracted from the summary
 */
export interface ParsedEvent extends StoredEvent {
  room: string;
  booker: string | null;
}

/**
 * The port every event format service must implement
 */
export interface EventFormatPort {
  /**
   * Parse a stored event: extract the room and booker from the summary
   */
  parse(event: StoredEvent): ParsedEvent;
  /**
   * Serialize a booking into the standardized event format: the summary is
   * "room short name | booker", the contact goes into the description
   */
  serialize(booking: BookingEventSource): EventDraft;
}
