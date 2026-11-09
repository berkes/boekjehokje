/**
 * Room column visibility helpers
 *
 * Pure functions behind the useRoomVisibility hook: toggling a room in
 * the hidden set and filtering rooms down to the visible ones. Kept
 * React-free so they stay unit-testable without a React environment.
 */

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
 * Filter rooms down to the visible ones (pure). Returning an empty list
 * is allowed: the user chose to hide every column, and the calendar
 * renders an empty board for that.
 */
export function visibleRooms<T extends { canonicalName: string }>(
  rooms: readonly T[],
  hidden: ReadonlySet<string>,
): T[] {
  return rooms.filter((room) => !hidden.has(room.canonicalName));
}
