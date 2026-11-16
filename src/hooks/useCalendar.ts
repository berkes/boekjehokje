/**
 * React hook for calendar data
 *
 * The React bridge to the calendar service: it calls the service (from the
 * service tree, via useCalendarService — or an explicitly composed
 * override, e.g. the demo calendar's) and manages the result as normal
 * React state: rooms, loading and error.
 */

import { useCallback, useState } from "react";
import {
  type Booking,
  CalendarApiError,
  type CalendarServicePort,
  type Room,
  SessionExpiredError,
} from "../services/index.ts";
import { useCalendarService } from "./useServices.ts";
import { useSession } from "./useSession.tsx";

/**
 * Return type for useCalendar hook
 */
export interface UseCalendarReturn {
  /** (re)Load the calendar data for the given day **/
  load: (day: Date) => Promise<void>;
  /** All rooms with their bookings for the loaded day */
  rooms: Room[];
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Any error that occurred, or null */
  error: Error | null;
  /** Get bookings for a specific room */
  getBookingsForRoom: (roomName: string) => Booking[];
  /** Get a specific room by name */
  getRoomByName: (roomName: string) => Room | null;
}

/**
 * Custom hook for accessing calendar room booking data
 *
 * @param service - The calendar service to use; defaults to the one from
 *                  the service tree. Pass an explicitly composed service
 *                  (e.g. the demo calendar's) to use another source.
 *
 * @example
 * ```typescript
 * function RoomList() {
 *   const { rooms, isLoading, error, load } = useCalendar();
 *   ...
 * }
 * ```
 */
export function useCalendar(
  service?: CalendarServicePort,
): UseCalendarReturn {
  const contextService = useCalendarService();
  const calendar = service ?? contextService;
  const { expireSession } = useSession();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load the calendar data for the given day through the calendar
   * service port. When the session expired and could not be
   * re-established silently (the service reports a 401 it cannot recover
   * from), the session is ended here instead of surfacing the raw API
   * error: the app returns to the anonymous homepage with a message
   * (issue #23).
   */
  const load = useCallback(async (day: Date) => {
    // Clear previous error
    setError(null);

    try {
      setIsLoading(true);

      const roomsWithBookings = await calendar.getDay(day);
      setRooms(roomsWithBookings);
    } catch (err: unknown) {
      if (
        err instanceof SessionExpiredError ||
        (err instanceof CalendarApiError && err.statusCode === 401)
      ) {
        console.error("Session expired:", err);
        expireSession();
      } else if (err instanceof CalendarApiError) {
        console.error("Calendar API error:", err.message, err.originalError);
        setError(err);
      } else if (err instanceof Error) {
        console.error("Calendar error:", err.message);
        setError(err);
      } else {
        console.error("Unknown calendar error:", err);
        setError(new Error(String(err)));
      }
      setRooms([]);
    } finally {
      setIsLoading(false);
    }
  }, [calendar, expireSession]);

  /**
   * Get bookings for a specific room (from already loaded data)
   */
  const getBookingsForRoom = useCallback(
    (roomName: string): Booking[] => {
      const room = rooms.find((r) => r.canonicalName === roomName);
      return room?.bookings || [];
    },
    [rooms],
  );

  /**
   * Get a specific room by name
   */
  const getRoomByName = useCallback(
    (roomName: string): Room | null => {
      return rooms.find((r) => r.canonicalName === roomName) || null;
    },
    [rooms],
  );

  return {
    load,
    rooms,
    isLoading,
    error,
    getBookingsForRoom,
    getRoomByName,
  };
}
