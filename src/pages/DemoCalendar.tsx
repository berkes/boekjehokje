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
import React, { useEffect, useState } from "react";
import { Calendar } from "../components/calendar/Calendar.tsx";
import { useUser } from "../context/useUser.ts";
import {
  DemoCalendarAdapter,
  getThisWeek,
  type Room,
} from "../services/index.ts";

/**
 * Load the rooms with their demo bookings for the current week
 */
function useDemoRooms(profile: { name: string; email: string } | null): {
  rooms: Room[];
  isLoading: boolean;
  error: Error | null;
} {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!profile) {
      setRooms([]);
      setIsLoading(false);
      return;
    }

    new DemoCalendarAdapter(profile).getRoomsWithBookings(getThisWeek())
      .then((result) => {
        setRooms(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });
  }, [profile]);

  return { rooms, isLoading, error };
}

/**
 * Demo calendar: the real calendar with demo data, served for the
 * logged-in user
 */
export function DemoCalendar(): React.JSX.Element {
  const { user } = useUser();
  const { rooms, isLoading, error } = useDemoRooms(user);

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
      <Calendar rooms={rooms} />
    </Box>
  );
}
