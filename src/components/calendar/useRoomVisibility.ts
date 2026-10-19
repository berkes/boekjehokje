/**
 * Room column visibility state
 *
 * Keeps track of which room columns the user has hidden, starting
 * from the preference stored in localStorage. Toggling a column
 * persists the new preference immediately. Hiding every column is
 * allowed; the calendar then renders an empty grid.
 */
import { useCallback, useMemo, useState } from "react";
import {
  loadHiddenRooms,
  saveHiddenRooms,
  toggleHiddenRoom,
  visibleRooms,
} from "./roomVisibility.ts";
import type { CalendarRoom } from "./utils.tsx";

/**
 * State and actions for room column visibility
 */
export interface RoomVisibility {
  /** Rooms with a visible column, in display order */
  rooms: CalendarRoom[];
  /** Canonical names of the hidden rooms */
  hidden: ReadonlySet<string>;
  /** Show the column if it is hidden, hide it otherwise */
  toggle: (roomId: string) => void;
}

/**
 * Track and persist which room columns are visible
 */
export function useRoomVisibility(allRooms: CalendarRoom[]): RoomVisibility {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() =>
    loadHiddenRooms()
  );

  const toggle = useCallback(
    (roomId: string): void => {
      const next = toggleHiddenRoom(hidden, roomId);
      setHidden(next);
      saveHiddenRooms(next);
    },
    [hidden],
  );

  const rooms = useMemo(
    () => visibleRooms(allRooms, hidden),
    [allRooms, hidden],
  );

  return { rooms, hidden, toggle };
}
