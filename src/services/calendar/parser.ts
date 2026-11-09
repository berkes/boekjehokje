/**
 * Event parser for the calendar service
 *
 * Turns stored events (StoredEvent, the neutral language of the calendar
 * event repository port) into parsed events (parseEvent), extracting the
 * room and booker from the event summary. Uses the room configuration
 * from rooms.ts. The write side of the standardized event format
 * (bookingToEvent) lives in eventFormat.ts.
 */

import type { StoredEvent } from "./CalendarEventRepositoryPort.ts";
import { ROOMS, UNKNOWN_ROOM } from "./rooms.ts";

/**
 * Parsed event: a stored event with the room and booker extracted from
 * its summary
 */
export interface ParsedEvent extends StoredEvent {
  room: string;
  booker: string | null;
}

/**
 * Extract room name from event summary
 */
function extractRoom(summary: string): string {
  const [begin, end] = containsRoom(summary);
  if (begin !== -1 && end !== -1) {
    const roomPart = summary.substring(begin, end);
    return normalizeRoomName(roomPart);
  } else {
    return UNKNOWN_ROOM;
  }
}

/**
 * Extract booker name from the full event summary: remove every room
 * mention and every exclusion word, then trim spaces and non-word chars
 * on both sides of the leftover — that is the name
 */
function extractBooker(summary: string): string | null {
  let text = summary;

  // Remove every room mention (canonical name, short name or alias)
  let room = containsRoom(text);
  while (room[0] !== -1) {
    text = text.substring(0, room[0]) + text.substring(room[1]);
    room = containsRoom(text);
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

/**
 * Parse a stored event into a ParsedEvent: extract the room and booker
 * from the summary
 */
export function parseEvent(event: StoredEvent): ParsedEvent {
  return {
    ...event,
    room: extractRoom(event.summary),
    booker: extractBooker(event.summary),
  };
}

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
 * Normalize a room name to its canonical form
 */
function normalizeRoomName(roomName: string): string {
  const lowerName = roomName.toLowerCase().trim();

  for (const room of ROOMS) {
    if (
      room.canonicalName.toLowerCase() === lowerName ||
      room.shortName.toLowerCase() === lowerName ||
      room.aliases.some((alias) => alias.toLowerCase() === lowerName)
    ) {
      return room.canonicalName;
    }
  }

  return UNKNOWN_ROOM;
}

/**
 * Check if we can find this room in a given text by its canonical name and then by any of its aliases
 */
function containsRoom(text: string): [number, number] {
  if (text.length <= 0) return [-1, -1];

  text = text.toLowerCase();
  for (const room of ROOMS) {
    let index = text.indexOf(room.canonicalName.toLowerCase());
    if (index >= 0) return [index, index + room.canonicalName.length];

    index = text.indexOf(room.shortName.toLowerCase());
    if (index >= 0) return [index, index + room.shortName.length];

    for (const alias of room.aliases) {
      index = text.indexOf(alias.toLowerCase());
      if (index >= 0) return [index, index + alias.length];
    }
  }

  return [-1, -1];
}
