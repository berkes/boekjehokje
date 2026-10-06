/**
 * React hook for calendar data
 *
 * Provides easy integration with UI components for displaying
 * room bookings from the NYMA makersplaats calendar.
 */

import { useCallback, useEffect, useState } from "react";
import { useUser } from "../context/useUser.ts";
import {
  type Booking,
  CalendarApiError,
  createCalendarService,
  type RoomBookings,
} from "../services/index.ts";

/**
 * Return type for useCalendar hook
 */
export interface UseCalendarReturn {
  /** All room bookings for the current week */
  roomBookings: RoomBookings[];
  /** Whether data is currently loading */
  isLoading: boolean;
  /** Any error that occurred, or null */
  error: Error | null;
  /** Refresh the calendar data */
  refresh: () => Promise<void>;
  /** Get bookings for a specific room */
  getBookingsForRoom: (roomName: string) => Booking[];
}

/**
 * Custom hook for accessing calendar room booking data
 *
 * @returns Object with roomBookings, loading state, error, and refresh function
 *
 * @example
 * ```typescript
 * function RoomList() {
 *   const { roomBookings, isLoading, error, refresh } = useCalendar();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {roomBookings.map(room => (
 *         <RoomCard key={room.room} room={room} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useCalendar(): UseCalendarReturn {
  const { tokens } = useUser();
  const [roomBookings, setRoomBookings] = useState<RoomBookings[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Load calendar data from API using CalendarService
   */
  const loadCalendarData = useCallback(async () => {
    // Clear previous error
    setError(null);

    // Check if user has access token
    if (!tokens?.accessToken) {
      setRoomBookings([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Create service with dependency injection
      const calendarService = await createCalendarService(tokens.accessToken);

      const bookings = await calendarService.getBookings();
      setRoomBookings(bookings);
    } catch (err: unknown) {
      // Handle CalendarApiError and other errors
      if (err instanceof CalendarApiError) {
        console.error("Calendar API error:", err.message, err.originalError);
        setError(err);
      } else if (err instanceof Error) {
        console.error("Calendar error:", err.message);
        setError(err);
      } else {
        console.error("Unknown calendar error:", err);
        setError(new Error(String(err)));
      }
      setRoomBookings([]);
    } finally {
      setIsLoading(false);
    }
  }, [tokens?.accessToken]);

  /**
   * Initial load on mount
   */
  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  /**
   * Refresh function to manually reload data
   */
  const refresh = useCallback(async () => {
    await loadCalendarData();
  }, [loadCalendarData]);

  /**
   * Get bookings for a specific room (from already loaded data)
   */
  const getBookingsForRoom = useCallback(
    (roomName: string): Booking[] => {
      const room = roomBookings.find((r) => r.room === roomName);
      return room?.bookings || [];
    },
    [roomBookings],
  );

  return {
    roomBookings,
    isLoading,
    error,
    refresh,
    getBookingsForRoom,
  };
}
