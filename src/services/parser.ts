/**
 * Room parser for CalendarService
 *
 * Parses event summaries to extract room and booker information.
 * Uses room configuration from rooms.ts.
 * Populates Room instances with their bookings.
 */

import {
  BOOKER_EXCLUSIONS,
  type Booking,
  type Room,
  Room as RoomClass,
  ROOM_ALIAS_MAP,
  type RoomName,
  ROOMS,
  UNKNOWN_ROOM,
} from "./rooms.ts";

/**
 * Google Calendar API event type
 */
import type { CalendarEvent } from "../utils/types.ts";

export type { Booking, CalendarEvent, Room, RoomName };

/**
 * Parsed event with extracted room and booker information
 */
export interface ParsedEvent {
  id: string;
  uid: string;
  summary: string;
  room: RoomName;
  booker: string | null;
  creatorEmail: string,
  start: Date;
  end: Date;
  created: Date;
  status: string;
  sequence: number;
}

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
  const room = ROOM_ALIAS_MAP.get(lowerName);
  if (room) {
    return room.canonicalName;
  }

  // Check for exact canonical name match (case-sensitive)
  const normalizedInput = roomName.trim();
  for (const r of ROOMS) {
    if (r.canonicalName === normalizedInput) {
      return r.canonicalName;
    }
  }

  return UNKNOWN_ROOM;
}

/**
 * Get the Room instance for a given identifier
 */
export function getRoom(roomName: string): Room | null {
  const lowerName = roomName.toLowerCase().trim();
  return ROOM_ALIAS_MAP.get(lowerName) || null;
}

/**
 * Get the Room instance by its canonical name
 */
export function getRoomByCanonicalName(canonicalName: string): Room | null {
  for (const room of ROOMS) {
    if (room.canonicalName === canonicalName) {
      return room;
    }
  }
  return null;
}

/**
 * Extract room name from event summary
 */
export function extractRoom(summary: string): RoomName {
  // Split on structural separators (- and |) first. A room name can span
  // multiple words within one chunk (e.g. "02 stilte ruimte"), so try the
  // whole chunk before falling back to individual words.
  const chunks = summary.split(/[-|]/);

  for (const chunk of chunks) {
    const trimmedChunk = chunk.trim();

    const chunkRoom = normalizeRoomName(trimmedChunk);
    if (chunkRoom !== UNKNOWN_ROOM) {
      return chunkRoom;
    }

    const parts = trimmedChunk.split(/\s+/);

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
    creatorEmail: event.creator.email || "onbekend",
    start: startDate,
    end: endDate,
    created: createdDate,
    status: event.status,
    sequence: event.sequence || 0,
  };
}

/**
 * Convert ParsedEvent to Booking
 */
export function toBooking(parsedEvent: ParsedEvent): Booking {
  return {
    id: parsedEvent.id,
    uid: parsedEvent.uid,
    summary: parsedEvent.summary,
    details: {
      originalName: parsedEvent.summary,
      author: parsedEvent.creatorEmail,
    },
    room: parsedEvent.room,
    booker: parsedEvent.booker,
    start: parsedEvent.start,
    end: parsedEvent.end,
  };
}

/**
 * Parse and group events by room
 */
export function parseAndGroupEvents(
  events: CalendarEvent[],
): { room: Room; bookings: Booking[] }[] {
  const parsedEvents = events.map(parseEvent);
  const roomMap = new Map<
    string,
    { room: Room; parsedEvents: ParsedEvent[] }
  >();

  // Initialize all known rooms
  for (const room of ROOMS) {
    roomMap.set(room.canonicalName, { room, parsedEvents: [] });
  }

  for (const event of parsedEvents) {
    const roomName = event.room;

    // Find the matching room
    let roomEntry = roomMap.get(roomName);

    if (!roomEntry) {
      // Try to find a room by identifier
      const matchingRoom = getRoomByCanonicalName(roomName);
      if (matchingRoom) {
        roomEntry = roomMap.get(matchingRoom.canonicalName);
      }
    }

    if (!roomEntry) {
      // Route to Unknown room for unmatched events
      roomEntry = roomMap.get(UNKNOWN_ROOM);
    }

    if (roomEntry) {
      roomEntry.parsedEvents.push(event);
    }
  }

  // Convert to array of Room with Bookings
  const result: { room: Room; bookings: Booking[] }[] = [];
  for (const [_roomName, { room, parsedEvents }] of roomMap) {
    // Only include rooms that have bookings
    if (parsedEvents.length > 0) {
      const bookings = parsedEvents.map(toBooking);
      result.push({ room, bookings });
    }
  }

  result.sort((a, b) =>
    a.room.canonicalName.localeCompare(b.room.canonicalName)
  );

  return result;
}

/**
 * Populate Room instances with their bookings from parsed events
 * Creates new Room instances to avoid modifying the original static instances
 */
export function populateRoomsWithBookings(
  roomWithBookings: { room: Room; bookings: Booking[] }[],
): Room[] {
  const roomsWithData: Room[] = [];

  for (const { room, bookings } of roomWithBookings) {
    // Create a new Room instance with the same config
    const newRoom = new RoomClass(
      room.canonicalName,
      room.shortName,
      [...room.aliases],
    );

    // Set the bookings on the new Room instance
    newRoom.bookings = bookings;
    roomsWithData.push(newRoom);
  }

  return roomsWithData;
}

export {
  CANONICAL_ROOMS,
  createRooms,
  ROOMS,
  UNKNOWN_ROOM,
  UNKNOWN_ROOM_DESCRIPTION,
  UNKNOWN_ROOM_INSTANCE,
} from "./rooms.ts";
