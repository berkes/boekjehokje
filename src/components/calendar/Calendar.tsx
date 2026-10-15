/**
 * Calendar component: the wrapper around DayPilot
 *
 * This is the actual wrapper around the third-party DayPilot calendar:
 * it owns the DayPilot configuration and uses the helpers in utils.tsx
 * to translate between our domain model and DayPilot's shapes.
 * The rest of the app only sees the CalendarView container.
 */
import { DayPilotCalendar } from "@daypilot/daypilot-lite-react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import React, { useMemo, useState } from "react";
import { useCalendar } from "../../hooks/useCalendar.ts";
import { systemClock } from "../../utils/clock.ts";
import { CalendarToolbar } from "./CalendarToolbar.tsx";
import {
  type CalendarRoom,
  roomDescription,
  toColumns,
  toDayPilotString,
  toEvents,
} from "./utils.tsx";

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
 * How long the room info snackbar is shown, in milliseconds
 */
const SNACKBAR_AUTO_HIDE_MS = 4000;

/**
 * Props for Calendar component
 */
export interface CalendarProps {
  /** Rooms with their bookings to display */
  rooms: CalendarRoom[];
}

/**
 * Calendar component
 * Maps rooms to DayPilot columns and bookings to DayPilot events
 */
export function Calendar({ rooms }: CalendarProps): React.JSX.Element {
  const [selectedDate, setSelectedDate] = useState(() => systemClock.now());
  const [headerInfo, setHeaderInfo] = useState<string | null>(null);

  const columns = useMemo(() => toColumns(rooms), [rooms]);
  const events = useMemo(() => toEvents(rooms), [rooms]);
  const startDate = toDayPilotString(selectedDate);

  return (
    <Stack spacing={1}>
      <CalendarToolbar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        clock={systemClock}
      />
      <DayPilotCalendar
        {...CALENDAR_CONFIG}
        startDate={startDate}
        columns={columns}
        events={events}
        onHeaderClicked={(args) => {
          const room: CalendarRoom | undefined = rooms.find((r) =>
            r.canonicalName === String(args.column.id)
          );
          setHeaderInfo(room ? roomDescription(room) : null);
        }}
      />
      <Snackbar
        open={headerInfo !== null}
        message={headerInfo}
        autoHideDuration={SNACKBAR_AUTO_HIDE_MS}
        onClose={() => setHeaderInfo(null)}
      />
    </Stack>
  );
}

/**
 * Calendar view component
 * Fetches rooms with their bookings and renders the calendar
 * with loading, error and empty states
 */
export function CalendarView(): React.JSX.Element {
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
      <Calendar rooms={rooms} />
    </Box>
  );
}
