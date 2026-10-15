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
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import React, { useMemo, useState } from "react";
import { useCalendar } from "../../hooks/useCalendar.ts";
import { systemClock } from "../../utils/clock.ts";
import { CalendarToolbar } from "./CalendarToolbar.tsx";
import {
  type CalendarRoom,
  toColumns,
  toDayPilotString,
  toEvents,
} from "./utils.tsx";

/**
 * Static calendar configuration
 * Resources view: one column per room, time slots as rows
 */
const CALENDAR_CONFIG = {
  viewType: "Resources",
  timeFormat: "Clock24Hours",
  headerClickHandling: "Disabled",
  eventClickHandling: "Disabled",
  eventRightClickHandling: "Enabled",
  eventMoveHandling: "Disabled",
  durationBarVisible: false,
  hourWidth: 50,
} as const;

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
        <Typography>Laden...</Typography>
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
        <Typography color="error">Fout: {error.message}</Typography>
        <Button variant="contained" onClick={refresh}>
          Opnieuw proberen
        </Button>
      </Box>
    );
  }

  if (rooms.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography>Geen ruimtes gevonden.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          Ruimtes
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Afspraken voor deze week
        </Typography>
      </Box>
      <Calendar rooms={rooms} />
    </Box>
  );
}
