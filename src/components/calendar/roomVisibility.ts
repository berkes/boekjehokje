/**
 * Room column visibility persistence
 *
 * The calendar shows one column per room. On small screens that gets
 * squished, so users can toggle columns on and off with pills. The set
 * of hidden rooms is a user preference and therefore stored in
 * localStorage (never business data).
 *
 * Storage access is injected so the functions stay unit-testable
 * without a browser environment.
 */
import { STORAGE_KEYS } from "../../utils/storage.ts";
import type { CalendarRoom } from "./utils.tsx";

/**
 * Minimal storage surface needed to persist hidden rooms
 */
export interface RoomVisibilityStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Read the hidden room ids from localStorage.
 * Invalid or missing data yields an empty set: all columns visible.
 */
export function loadHiddenRooms(
  storage: RoomVisibilityStorage = globalThis.localStorage,
): ReadonlySet<string> {
  try {
    const serialized = storage.getItem(STORAGE_KEYS.HIDDEN_ROOMS);
    if (serialized === null) {
      return new Set();
    }
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(
      parsed.filter((id): id is string => typeof id === "string"),
    );
  } catch (error) {
    console.error("Failed to load hidden rooms:", error);
    return new Set();
  }
}

/**
 * Write the hidden room ids to localStorage.
 * Failing to save is non-essential: the preference is simply not kept.
 */
export function saveHiddenRooms(
  hidden: ReadonlySet<string>,
  storage: RoomVisibilityStorage = globalThis.localStorage,
): void {
  try {
    storage.setItem(
      STORAGE_KEYS.HIDDEN_ROOMS,
      JSON.stringify([...hidden]),
    );
  } catch (error) {
    console.error("Failed to save hidden rooms:", error);
  }
}

/**
 * Toggle a single room in the hidden set (pure)
 */
export function toggleHiddenRoom(
  hidden: ReadonlySet<string>,
  roomId: string,
): ReadonlySet<string> {
  const next = new Set(hidden);
  if (next.has(roomId)) {
    next.delete(roomId);
  } else {
    next.add(roomId);
  }
  return next;
}

/**
 * Filter rooms down to the visible ones.
 * Returning an empty list is allowed: the user chose to hide
 * every column, and the calendar renders an empty board for that.
 */
export function visibleRooms(
  rooms: CalendarRoom[],
  hidden: ReadonlySet<string>,
): CalendarRoom[] {
  return rooms.filter((room) => !hidden.has(room.canonicalName));
}
