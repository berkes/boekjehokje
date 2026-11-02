/**
 * Booking sidebar content
 *
 * Shows the details of a single booking as a definition list, rendered
 * inside the SidebarShell (which owns the placement, close button and
 * title). Opened by clicking an event in the calendar.
 */
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import React from "react";
import { type Booking } from "../../services/index.ts";
import type { CalendarRoom } from "./utils.tsx";

/**
 * Locale used for the full date labels
 */
const LOCALE = "nl-NL";

/**
 * Format for the start and end labels: full date plus time
 */
const FULL_DATE_TIME: Intl.DateTimeFormatOptions = {
  dateStyle: "full",
  timeStyle: "short",
};

/**
 * Props for BookingSidebar component
 */
export interface BookingSidebarProps {
  /** The booking whose details are shown */
  booking: Booking;
  /** The room the booking is in, for the short name */
  room?: CalendarRoom;
}

/**
 * Booking sidebar content component
 * Renders the booking details as a definition list
 */
export function BookingSidebar(
  { booking, room }: BookingSidebarProps,
): React.JSX.Element {
  const { start, end } = booking;
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const roomLabel = room ? `${booking.room} (${room.shortName})` : booking.room;

  const entries: [string, string][] = [
    [
      "Door",
      `${booking.booker ?? "Onbekend"} <${booking.details.author}>`,
    ],
    ["Beschrijving", booking.summary],
    ["Ruimte", roomLabel],
    ["Start", start.toLocaleString(LOCALE, FULL_DATE_TIME)],
    ["Eind", end.toLocaleString(LOCALE, FULL_DATE_TIME)],
    ["Duur", `${durationMinutes} minuten`],
  ];

  return (
    <Box component="dl" sx={{ m: 0 }}>
      {entries.map(([term, description]) => (
        <React.Fragment key={term}>
          <Typography
            component="dt"
            variant="overline"
            sx={{ display: "block" }}
          >
            {term}
          </Typography>
          <Typography
            component="dd"
            variant="body1"
            sx={{ my: 0, ml: 0 }}
            gutterBottom
          >
            {description}
          </Typography>
        </React.Fragment>
      ))}
    </Box>
  );
}
