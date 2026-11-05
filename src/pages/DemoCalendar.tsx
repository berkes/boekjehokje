/**
 * Demo calendar page
 *
 * Reachable on /demo but not linked anywhere. Renders exactly the same
 * calendar as the real page, but backed by the DemoCalendarAdapter: a
 * complete, realistic week of demo data for every room, with one
 * overlapping pair and one editable booking by the logged-in user per
 * weekday.
 * A place to review and screenshot all calendar features without
 * touching the live NYMA calendar. No login needed: without a logged-in
 * user the demo bookings are all read-only.
 */
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar } from "../components/calendar/Calendar.tsx";
import { useUser } from "../context/useUser.ts";
import {
  type BookingUpdate,
  DemoCalendarAdapter,
  type NewBooking,
  type Room,
} from "../services/index.ts";
import { isSameDay, systemClock } from "../utils/clock.ts";

/**
 * Demo calendar: the real calendar with demo data, served for the
 * logged-in user
 */
export function DemoCalendar(): React.JSX.Element {
  const { user } = useUser();
  const demoAdapter = useMemo(
    () => (user ? new DemoCalendarAdapter(user) : null),
    [user],
  );
  const [selectedDate, setSelectedDate] = useState(() => systemClock.now());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * (Re)load the demo bookings of the selected day whenever it changes,
   * like the real calendar does when switching days
   */
  useEffect(() => {
    if (!demoAdapter) {
      setRooms([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    demoAdapter.getDay(selectedDate)
      .then((result) => {
        setRooms(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });
  }, [demoAdapter, selectedDate]);

  /**
   * Switch the day the board shows; selecting the day already shown does
   * not trigger a reload
   */
  const selectDate = useCallback((date: Date): void => {
    setSelectedDate((previous) => isSameDay(previous, date) ? previous : date);
  }, []);
  const createBooking = useCallback(
    async (booking: NewBooking): Promise<void> => {
      await demoAdapter?.createBooking(booking);
    },
    [demoAdapter],
  );
  const updateBooking = useCallback(
    async (booking: BookingUpdate): Promise<void> => {
      await demoAdapter?.updateBooking(booking);
    },
    [demoAdapter],
  );
  const deleteBooking = useCallback(
    async (_bookingId: string): Promise<void> => {
      await demoAdapter?.deleteBooking();
    },
    [demoAdapter],
  );

  if (isLoading) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography>Laden...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 4 }}>
        <Typography color="error">Fout: {error.message}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Calendar
        rooms={rooms}
        selectedDate={selectedDate}
        onSelectDate={selectDate}
        onCreateBooking={createBooking}
        onUpdateBooking={updateBooking}
        onDeleteBooking={deleteBooking}
      />
    </Box>
  );
}
