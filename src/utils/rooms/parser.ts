/**
 * Room parser - internal module
 *
 * Parses event summaries to extract room and booker information.
 * Uses room configuration from config.ts.
 */

import {
  BOOKER_EXCLUSIONS,
  CANONICAL_ROOMS,
  ROOM_ALIASES,
  type RoomName,
  UNKNOWN_ROOM,
} from "./config.ts";

/**
 * Parsed event with extracted room and booker information
 * Internal type used during parsing
 */
export interface ParsedEvent {
  id: string;
  uid: string;
  summary: string;
  room: RoomName;
  booker: string | null;
  start: Date;
  end: Date;
  created: Date;
  status: string;
  sequence: number;
}

/**
 * Room events - events grouped by room
 * Internal type, not exported
 */
export interface RoomEventsInternal {
  room: RoomName;
  events: ParsedEvent[];
}

/**
 * Google Calendar API event type
 * Imported from shared types to avoid duplication
 */
import type { CalendarEvent } from "../types.ts";

export type { CalendarEvent };

/**
 * Check if a string looks like a person's name
 */
export function isPersonName(str: string): boolean {
  const trimmed = str.trim();

  if (trimmed.length < 2) return false;

  const lower = trimmed.toLowerCase();
  if (BOOKER_EXCLUSIONS.some((excl) => lower.includes(excl))) {
    return false;
  }

  if (!/[a-zA-Z]/.test(trimmed)) return false;
  if (!trimmed[0].match(/[A-Z]/)) return false;
  if (/^\d+$/.test(trimmed)) return false;

  return true;
}

/**
 * Separators used in event summaries
 */
const SEPARATORS = [
  /\s*-\s*/,
  /\s*\|\s*/,
  /\s+/,
] as const;

/**
 * Normalize a room name to its canonical form
 */
export function normalizeRoomName(roomName: string): RoomName {
  const lowerName = roomName.toLowerCase().trim();

  // Check if it's already a canonical room name (exact match)
  const canonicalRoomsLower = CANONICAL_ROOMS.map((r) => r.toLowerCase());
  const index = canonicalRoomsLower.indexOf(lowerName);
  if (index !== -1) {
    // Return the canonical name (not the original input)
    return CANONICAL_ROOMS[index];
  }

  const canonicalName = ROOM_ALIASES[lowerName];
  if (canonicalName) {
    return canonicalName;
  }

  return UNKNOWN_ROOM;
}

/**
 * Extract room name from event summary
 */
export function extractRoom(summary: string): RoomName {
  const parts = summary.split(/[-\| ]/);

  for (const part of parts) {
    const trimmedPart = part.trim();
    const normalized = normalizeRoomName(trimmedPart);

    if (normalized !== UNKNOWN_ROOM) {
      return normalized;
    }

    const lowerPart = trimmedPart.toLowerCase();
    const roomKeywords = [
      "kletshok",
      "stilteruimte",
      "tuinkamer",
      "vergader",
      "workshop",
      "c3",
    ];

    if (roomKeywords.some((keyword) => lowerPart.includes(keyword))) {
      return normalizeRoomName(trimmedPart);
    }
  }

  return UNKNOWN_ROOM;
}

/**
 * Extract booker name from event summary
 */
export function extractBooker(summary: string): string | null {
  const room = extractRoom(summary);

  if (room === UNKNOWN_ROOM) {
    for (const separator of SEPARATORS) {
      const parts = summary.split(separator);
      for (let i = parts.length - 1; i >= 0; i--) {
        const candidate = parts[i].trim();
        if (isPersonName(candidate)) {
          return candidate;
        }
      }
    }
    return null;
  }

  for (const separator of SEPARATORS) {
    const parts = summary.split(separator);

    let roomPartIndex = -1;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (normalizeRoomName(part) === room) {
        roomPartIndex = i;
        break;
      }
    }

    if (roomPartIndex >= 0 && roomPartIndex < parts.length - 1) {
      for (let i = roomPartIndex + 1; i < parts.length; i++) {
        const candidate = parts[i].trim();
        if (isPersonName(candidate)) {
          return candidate;
        }
        const words = candidate.split(/\s+/);
        for (let j = 0; j < words.length; j++) {
          const wordCandidate = words.slice(j).join(" ");
          if (isPersonName(wordCandidate)) {
            return wordCandidate;
          }
          if (isPersonName(words[j])) {
            return words[j];
          }
        }
      }
    }
  }

  const words = summary.split(/\s+/);
  for (let i = words.length - 1; i >= 0; i--) {
    const candidate = words[i].trim();
    if (isPersonName(candidate)) {
      const roomLower = room.toLowerCase();
      if (!roomLower.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }
    const multiWordCandidate = words.slice(i).join(" ");
    if (isPersonName(multiWordCandidate)) {
      const roomLower = room.toLowerCase();
      if (!roomLower.includes(multiWordCandidate.toLowerCase())) {
        return multiWordCandidate;
      }
    }
  }

  return null;
}

/**
 * Parse a raw calendar event into a ParsedEvent
 */
export function parseEvent(event: CalendarEvent): ParsedEvent {
  const startDate = event.start.dateTime
    ? new Date(event.start.dateTime)
    : new Date(event.start.date + "T00:00:00Z");

  const endDate = event.end.dateTime
    ? new Date(event.end.dateTime)
    : new Date(event.end.date + "T00:00:00Z");

  const createdDate = new Date(event.created);

  const room = extractRoom(event.summary);
  const booker = extractBooker(event.summary);

  return {
    id: event.id,
    uid: event.uid || "",
    summary: event.summary,
    room,
    booker,
    start: startDate,
    end: endDate,
    created: createdDate,
    status: event.status,
    sequence: event.sequence || 0,
  };
}

/**
 * Parse and group events by room
 */
export function parseAndGroupEvents(
  events: CalendarEvent[],
): RoomEventsInternal[] {
  const parsedEvents = events.map(parseEvent);
  const roomMap = new Map<RoomName, ParsedEvent[]>();

  for (const event of parsedEvents) {
    if (!roomMap.has(event.room)) {
      roomMap.set(event.room, []);
    }
    roomMap.get(event.room)!.push(event);
  }

  const result: RoomEventsInternal[] = [];
  for (const [room, roomEvents] of roomMap) {
    result.push({ room, events: roomEvents });
  }

  result.sort((a, b) => a.room.localeCompare(b.room));

  return result;
}
