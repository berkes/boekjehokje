/**
 * Room card component
 *
 * Displays a room with its bookings for the current week.
 * Shows room name, number of bookings, and preview of events.
 */

import React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { type RoomBookings } from "../services/CalendarService.ts";

/**
 * Dutch text constants
 */
const DUTCH_TEXT = {
  bookings: "afspraken",
  today: "vandaag",
  more: "meer",
  unknown: "Onbekend",
  noBookings: "Geen afspraken deze week",
} as const;

/**
 * Props for RoomCard component
 */
export interface RoomCardProps {
  room: RoomBookings;
}

/**
 * Room card component
 * Displays room information and a preview of its bookings
 */
export function RoomCard({ room }: RoomCardProps): React.JSX.Element {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get today's bookings
  const todayBookings = room.bookings.filter((booking) => {
    const bookingDate = new Date(booking.start);
    bookingDate.setHours(0, 0, 0, 0);
    return bookingDate.getTime() === today.getTime();
  });

  // Sort bookings by start time
  const sortedBookings = [...room.bookings].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  return (
    <Card>
      <CardHeader
        title={room.room}
        subheader={
          <Stack direction="row" spacing={1}>
            <Chip
              label={`${room.bookings.length} ${DUTCH_TEXT.bookings}`}
              size="small"
            />
            {todayBookings.length > 0 && (
              <Chip
                label={`${todayBookings.length} ${DUTCH_TEXT.today}`}
                size="small"
                color="primary"
              />
            )}
          </Stack>
        }
      />
      <CardContent>
        {room.bookings.length > 0
          ? (
            <Stack spacing={0.5}>
              {sortedBookings.slice(0, 3).map((booking) => (
                <Typography
                  key={booking.id}
                  variant="body2"
                  color="text.secondary"
                >
                  {formatTime(booking.start)} -{" "}
                  {booking.booker || DUTCH_TEXT.unknown}
                </Typography>
              ))}
              {room.bookings.length > 3 && (
                <Typography variant="body2" color="text.secondary">
                  + {room.bookings.length - 3} {DUTCH_TEXT.more}
                </Typography>
              )}
            </Stack>
          )
          : (
            <Typography variant="body2" color="text.secondary">
              {DUTCH_TEXT.noBookings}
            </Typography>
          )}
      </CardContent>
    </Card>
  );
}

/**
 * Format a date to time string in Dutch locale
 *
 * @param date - The date to format
 * @returns Formatted time string (e.g., "09:00" or "14:30")
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
