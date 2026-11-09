/**
 * Event format service
 *
 * Implements the EventFormatPort: the standardized event format in both
 * directions. Parsing extracts the room and booker from an event summary
 * (the room matching itself is the rooms service's job, injected on
 * creation); serializing is the inverse, producing the draft the calendar
 * event repository stores. Pure and functional: no state beyond the
 * injected rooms service.
 */

import type {
  EventDraft,
  StoredEvent,
} from "../calendar/CalendarEventRepositoryPort.ts";
import type { BookingEventSource } from "../calendar/CalendarServicePort.ts";
import { type RoomsPort, UNKNOWN_ROOM } from "../rooms/RoomsPort.ts";
import type { EventFormatPort, ParsedEvent } from "./EventFormatPort.ts";

/**
 * Words to exclude from booker extraction: removed from the summary
 * before the leftover is taken as the booker's name
 */
const BOOKER_EXCLUSIONS = [
  "unit",
  "nyma",
  "makersplaats",
  "team",
  "streek",
  "bakker",
  "info",
  "test",
  "workshop",
  "cursus",
  "vergader",
  "ruimte",
  "kletshok",
  "kletskubus",
  "stilteruimte",
  "stilte",
  "tuinkamer",
  "c3",
  "kh",
  "brn",
  "ev",
  "wt",
] as const;

/**
 * The dependencies of the event format service, passed in on creation
 */
export interface EventFormatServiceDeps {
  /** The rooms service, matching room mentions in summaries */
  rooms: RoomsPort;
}

/**
 * Event format service
 */
export class EventFormatService implements EventFormatPort {
  private rooms: RoomsPort;

  /**
   * Create a new event format service
   *
   * @param deps - The injected dependency: the rooms service
   */
  constructor(deps: EventFormatServiceDeps) {
    this.rooms = deps.rooms;
  }

  /**
   * Parse a stored event: extract the room and booker from the summary
   */
  parse(event: StoredEvent): ParsedEvent {
    return {
      ...event,
      room: this.extractRoom(event.summary),
      booker: this.extractBooker(event.summary),
    };
  }

  /**
   * Serialize a booking into the standardized event format: the inverse of
   * parse. The summary is "room short name | booker" (the same format the
   * booking form previews), so parsing the written event yields the same
   * room and booker; the contact goes into the description.
   */
  serialize(booking: BookingEventSource): EventDraft {
    const room = this.rooms.all().find((r) => r.canonicalName === booking.room);
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

  /**
   * Extract the room from an event summary via the rooms service
   */
  private extractRoom(summary: string): string {
    const mention = this.rooms.findMention(summary);
    if (mention) {
      return this.rooms.normalize(
        summary.substring(mention.begin, mention.end),
      );
    }
    return UNKNOWN_ROOM;
  }

  /**
   * Extract the booker name from the full event summary: remove every room
   * mention and every exclusion word, then trim spaces and non-word chars
   * on both sides of the leftover — that is the name
   */
  private extractBooker(summary: string): string | null {
    let text = summary;

    // Remove every room mention (canonical name, short name or alias)
    let mention = this.rooms.findMention(text);
    while (mention) {
      text = text.substring(0, mention.begin) + text.substring(mention.end);
      mention = this.rooms.findMention(text);
    }

    // Remove the exclusion words
    for (const word of BOOKER_EXCLUSIONS) {
      text = text.replaceAll(new RegExp(`\\b${word}\\b`, "gi"), "");
    }

    // The leftover, trimmed of spaces and non-word chars on both sides,
    // is the name
    const name = text
      .replace(/\s+/g, " ")
      .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    return name === "" ? null : name;
  }
}
