/**
 * Room list component
 *
 * Displays a DayPilot resource calendar with all rooms as columns
 * and their bookings for the current week as events.
 * Shows loading state, error state, and empty state.
 */

import { DayPilot, DayPilotCalendar } from "@daypilot/daypilot-lite-react";
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import React, { useMemo, useState } from "react";
import { useCalendar } from "../hooks/useCalendar.ts";
import { type Booking, UNKNOWN_ROOM } from "../services/index.ts";

/**
 * Dutch text constants
 */
const DUTCH_TEXT = {
  loading: "Laden...",
  errorPrefix: "Fout: ",
  retry: "Opnieuw proberen",
  title: "Ruimtes",
  subtitle: "Afspraken voor deze week",
  noRooms: "Geen ruimtes gevonden.",
  previous: "Vorige",
  next: "Volgende",
  today: "Vandaag",
  unknownDescription:
    "Boekingen die we niet konden koppelen, bijvoorbeeld door een typfout",
} as const;

/**
 * Static calendar configuration
 * Resources view: one column per room, time slots as rows
 */
const CALENDAR_CONFIG = {
  viewType: "Resources",
  timeFormat: "Clock24Hours",
  headerClickHandling: "Enabled",
} as const;

/**
 * Weekday quick-navigation labels (Monday to Friday)
 */
const WEEKDAY_LABELS = ["ma", "di", "wo", "do", "vr"] as const;

/**
 * Props for ResourceCalendar component
 */
interface ResourceCalendarProps {
  rooms: { canonicalName: string; shortName: string; bookings: Booking[] }[];
}

/**
 * Convert a Date to a DayPilot-compatible ISO string
 * DayPilot interprets date strings without timezone suffix as local time
 */
function toDayPilotString(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${
      pad(date.getSeconds())
    }`
  );
}

/**
 * Long description of a room, shown as tooltip
 */
function roomDescription(room: {
  canonicalName: string;
}): string {
  return room.canonicalName === UNKNOWN_ROOM
    ? DUTCH_TEXT.unknownDescription
    : room.canonicalName;
}

/**
 * Resource calendar component
 * Maps rooms to DayPilot columns and bookings to DayPilot events
 */
function ResourceCalendar({ rooms }: ResourceCalendarProps): React.JSX.Element {
  const [startDate, setStartDate] = useState(() => DayPilot.Date.today());
  const [headerInfo, setHeaderInfo] = useState<string | null>(null);

  // Days of the current week (Monday to Friday) for quick navigation
  const weekDays = useMemo(() => {
    const today = DayPilot.Date.today();
    const monday = today.addDays(-((today.toDate().getDay() + 6) % 7));
    return WEEKDAY_LABELS.map((label, index) => ({
      label,
      date: monday.addDays(index),
    }));
  }, []);

  const isPastDay = (day: DayPilot.Date): boolean =>
    day.toString() < DayPilot.Date.today().toString();

  const isSelectedDay = (day: DayPilot.Date): boolean =>
    day.toString() === startDate.toString();

  // Map rooms to calendar columns (resources), with Unknown always last
  const columns = useMemo(
    () =>
      [...rooms]
        .sort((a, b) =>
          a.canonicalName === UNKNOWN_ROOM
            ? 1
            : b.canonicalName === UNKNOWN_ROOM
            ? -1
            : 0
        )
        .map((room) => ({
          id: room.canonicalName,
          name: room.shortName,
          toolTip: roomDescription(room),
        })),
    [rooms],
  );

  // Map bookings to calendar events
  const events = useMemo(
    () =>
      rooms.flatMap((room) =>
        room.bookings.map((booking) => ({
          id: booking.id,
          text: booking.booker || booking.summary,
          start: toDayPilotString(booking.start),
          end: toDayPilotString(booking.end),
          resource: room.canonicalName,
          toolTip: booking.summary,
        }))
      ),
    [rooms],
  );

  return (
    <Stack spacing={1}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <IconButton
            size="small"
            aria-label={DUTCH_TEXT.previous}
            onClick={() => setStartDate((day) => day.addDays(-1))}
          >
            <ChevronLeft />
          </IconButton>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setStartDate(DayPilot.Date.today())}
          >
            {DUTCH_TEXT.today}
          </Button>
          <IconButton
            size="small"
            aria-label={DUTCH_TEXT.next}
            onClick={() => setStartDate((day) => day.addDays(1))}
          >
            <ChevronRight />
          </IconButton>
          {weekDays.map(({ label, date }) => (
            <Button
              key={label}
              size="small"
              variant={isSelectedDay(date) ? "contained" : "outlined"}
              onClick={() => setStartDate(date)}
              sx={{
                minWidth: 44,
                ...(isPastDay(date) && !isSelectedDay(date) && {
                  color: "text.disabled",
                  borderColor: "action.disabledBackground",
                }),
              }}
            >
              {label}
            </Button>
          ))}
        </Stack>
        <Typography variant="body1">
          {startDate.toDate().toLocaleDateString("nl-NL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </Typography>
      </Box>
      <DayPilotCalendar
        {...CALENDAR_CONFIG}
        startDate={startDate}
        columns={columns}
        events={events}
        onHeaderClicked={(args) => {
          const room = rooms.find((r) =>
            r.canonicalName === String(args.column.id)
          );
          setHeaderInfo(room ? roomDescription(room) : null);
        }}
      />
      <Snackbar
        open={headerInfo !== null}
        message={headerInfo}
        autoHideDuration={4000}
        onClose={() => setHeaderInfo(null)}
      />
    </Stack>
  );
}

/**
 * Room list component
 * Displays all rooms with their bookings for the current week
 * Uses Room class instances from useCalendar
 */
export function RoomList(): React.JSX.Element {
  const { rooms, isLoading, error, refresh } = useCalendar();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 4,
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>{DUTCH_TEXT.loading}</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          py: 4,
          gap: 2,
        }}
      >
        <Typography color="error">
          {DUTCH_TEXT.errorPrefix}
          {error.message}
        </Typography>
        <Button variant="contained" onClick={refresh}>
          {DUTCH_TEXT.retry}
        </Button>
      </Box>
    );
  }

  if (rooms.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography>{DUTCH_TEXT.noRooms}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          {DUTCH_TEXT.title}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {DUTCH_TEXT.subtitle}
        </Typography>
      </Box>
      <ResourceCalendar rooms={rooms} />
    </Box>
  );
}
