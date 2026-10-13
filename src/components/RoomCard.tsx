/**
 * Room card component
 *
 * Displays a room with its bookings for the current week.
 * Shows:
 * - Previous bookings (greyed out)
 * - Today's bookings (normal)
 * - Future bookings (black)
 * - "+N rest of week" for bookings from tomorrow onwards
 */

import React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import type { Room } from "../services/index.ts";

/**
 * Dutch text constants
 */
const DUTCH_TEXT = {
  today: "vandaag",
  restOfWeek: "rest van de week",
  unknown: "Onbekend",
  noBookings: "Geen afspraken deze week",
} as const;

/**
 * Props for RoomCard component
 */
export interface RoomCardProps {
  room: Room;
}

/**
 * Room card component
 * Displays room information with categorized bookings:
 * - Previous bookings (greyed out)
 * - Today's bookings (normal)
 * - Future bookings (from tomorrow, as "+N rest of week")
 */
export function RoomCard({ room }: RoomCardProps): React.JSX.Element {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get categorized bookings
  const previousBookings = room.previousBookings();
  const todayBookings = room.todayBookings();
  const futureBookings = room.futureBookings();

  // Sort all bookings by start time for display
  const allBookings = [...room.bookings].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );

  // Check if there are any bookings
  const hasBookings = room.bookings.length > 0;

  return (
    <Card>
      <CardHeader
        title={room.canonicalName}
        subheader={
          room.hasTodayBookings() && (
            <Chip
              label={`${todayBookings.length} ${DUTCH_TEXT.today}`}
              size="small"
              color="primary"
            />
          )
        }
      />
      <CardContent>
        {hasBookings
          ? (
            <Stack spacing={0.5}>
              {/* Previous bookings (greyed out) */}
              {previousBookings.length > 0 && (
                <Stack spacing={0.5}>
                  {previousBookings.slice(0, 3).map((booking) => (
                    <Typography
                      key={booking.id}
                      variant="body2"
                      color="text.disabled"
                    >
                      {formatTime(booking.start)} -{" "}
                      {booking.booker || DUTCH_TEXT.unknown}
                    </Typography>
                  ))}
                </Stack>
              )}

              {/* Today's bookings */}
              {todayBookings.length > 0 && (
                <Stack spacing={0.5}>
                  {todayBookings.slice(0, 3).map((booking) => (
                    <Typography
                      key={booking.id}
                      variant="body2"
                      color="text.primary"
                    >
                      {formatTime(booking.start)} -{" "}
                      {booking.booker || DUTCH_TEXT.unknown}
                    </Typography>
                  ))}
                </Stack>
              )}

              {/* Future bookings - show first 2, then +N rest of week */}
              {futureBookings.length > 0 && (
                <Stack spacing={0.5}>
                  {futureBookings.slice(0, 2).map((booking) => (
                    <Typography
                      key={booking.id}
                      variant="body2"
                      color="text.primary"
                      sx={{ fontWeight: "bold" }}
                    >
                      {formatTime(booking.start)} -{" "}
                      {booking.booker || DUTCH_TEXT.unknown}
                    </Typography>
                  ))}
                  {futureBookings.length > 2 && (
                    <Typography
                      variant="body2"
                      color="text.primary"
                      sx={{ fontWeight: "bold" }}
                    >
                      +{futureBookings.length} {DUTCH_TEXT.restOfWeek}
                    </Typography>
                  )}
                  {futureBookings.length === 2 && futureBookings.length > 0 && (
                    <Typography
                      variant="body2"
                      color="text.primary"
                      sx={{ fontWeight: "bold" }}
                    >
                      +{futureBookings.length} {DUTCH_TEXT.restOfWeek}
                    </Typography>
                  )}
                </Stack>
              )}

              {/* If no previous, today, or future but has bookings, show all */}
              {previousBookings.length === 0 && todayBookings.length === 0 && futureBookings.length === 0 && hasBookings && (
                <Stack spacing={0.5}>
                  {allBookings.slice(0, 3).map((booking) => (
                    <Typography
                      key={booking.id}
                      variant="body2"
                      color="text.primary"
                    >
                      {formatTime(booking.start)} -{" "}
                      {booking.booker || DUTCH_TEXT.unknown}
                    </Typography>
                  ))}
                  {allBookings.length > 3 && (
                    <Typography variant="body2" color="text.secondary">
                      +{allBookings.length - 3} {DUTCH_TEXT.restOfWeek}
                    </Typography>
                  )}
                </Stack>
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
