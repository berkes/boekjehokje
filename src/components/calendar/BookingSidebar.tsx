/**
 * Booking sidebar
 *
 * Shows the details of a single booking as a definition list.
 * Opened by clicking an event in the calendar; on desktop it is placed
 * next to the calendar view, on mobile it is shown in a drawer over it.
 */
import { Close } from "@mui/icons-material";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import React from "react";
import { type Booking } from "../../services/index.ts";
import type { CalendarRoom } from "./utils.tsx";

/**
 * Width of the sidebar on desktop
 */
export const SIDEBAR_WIDTH = 320;

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
  /** Close the sidebar */
  onClose: () => void;
}

/**
 * Booking sidebar component
 * Renders the booking details as a definition list
 */
export function BookingSidebar(
  { booking, room, onClose }: BookingSidebarProps,
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
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <IconButton
          size="small"
          aria-label="Sluiten"
          onClick={onClose}
          sx={{ p: 0 }}
        >
          <Close />
        </IconButton>
        <Typography variant="h6">
          {booking.booker || booking.summary} — {booking.room}
        </Typography>
      </Stack>
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
    </Stack>
  );
}
