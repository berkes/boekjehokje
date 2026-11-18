/**
 * Room column visibility state
 *
 * Keeps track of which room columns the user has hidden, starting from
 * the preference stored through the preferences service. When no
 * preference was stored yet, the Unknown room is hidden by default
 * (issue #63) until the user enables it. Toggling a column persists the
 * new preference immediately. Hiding every column is allowed; the
 * calendar then renders an empty grid.
 */
import { useCallback, useMemo, useState } from "react";
import { usePreferences } from "./useServices.ts";
import {
  defaultHiddenRooms,
  toggleHiddenRoom,
  visibleRooms,
} from "./roomVisibility.ts";

export { defaultHiddenRooms, toggleHiddenRoom, visibleRooms };

/**
 * State and actions for room column visibility
 */
export interface RoomVisibility<T> {
  /** Rooms with a visible column, in display order */
  rooms: T[];
  /** Canonical names of the hidden rooms */
  hidden: ReadonlySet<string>;
  /** Show the column if it is hidden, hide it otherwise */
  toggle: (roomId: string) => void;
}

/**
 * Track and persist which room columns are visible
 */
export function useRoomVisibility<T extends { canonicalName: string }>(
  allRooms: readonly T[],
): RoomVisibility<T> {
  const preferences = usePreferences();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() =>
    preferences.getHiddenRooms() ?? defaultHiddenRooms()
  );

  const toggle = useCallback(
    (roomId: string): void => {
      const next = toggleHiddenRoom(hidden, roomId);
      setHidden(next);
      preferences.saveHiddenRooms(next);
    },
    [hidden, preferences],
  );

  const rooms = useMemo(
    () => visibleRooms(allRooms, hidden),
    [allRooms, hidden],
  );

  return { rooms, hidden, toggle };
}
