/**
 * Calendar component: the wrapper around DayPilot
 *
 * This is the actual wrapper around the third-party DayPilot calendar:
 * it owns the DayPilot configuration and uses the helpers in utils.tsx
 * to translate between our domain model and DayPilot's shapes.
 * The rest of the app only sees the CalendarView container.
 */
import { type DayPilot, DayPilotCalendar } from "@daypilot/daypilot-lite-react";
import { Delete, Edit, Info } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { useTheme } from "@mui/material/styles";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import React, { useMemo, useState } from "react";
import { useUser } from "../../context/useUser.ts";
import { useCalendar } from "../../hooks/useCalendar.ts";
import { type Booking } from "../../services/index.ts";
import { systemClock } from "../../utils/clock.ts";
import { BookingSidebar, SIDEBAR_WIDTH } from "./BookingSidebar.tsx";
import { CalendarToolbar } from "./CalendarToolbar.tsx";
import { RoomVisibiltyControls } from "./RoomVisibiltyControls.tsx";
import { useRoomVisibility } from "./useRoomVisibility.ts";
import {
  type CalendarRoom,
  findBooking,
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
  timeRangeSelectedHandling: "Disabled",
  eventMoveHandling: "Disabled",
  eventResizeHandling: "Disabled",
  eventDeleteHandling: "Disabled",
  eventClickHandling: "Disabled",
  eventRightClickHandling: "Disabled",
  durationBarVisible: false,
  headerHeightAutoFit: false,
  headerHeight: 50,
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
 * Maps rooms to DayPilot columns and bookings to DayPilot events.
 * Clicking an event opens the booking sidebar.
 */
export function Calendar({ rooms }: CalendarProps): React.JSX.Element {
  const [selectedDate, setSelectedDate] = useState(() => systemClock.now());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { profile } = useUser();

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const { rooms: visibleRooms, hidden, toggle } = useRoomVisibility(rooms);

  const columns = useMemo(() => toColumns(visibleRooms), [visibleRooms]);
  const events = useMemo(
    () => toEvents(visibleRooms, profile),
    [visibleRooms, profile],
  );
  const startDate = toDayPilotString(selectedDate);

  /**
   * Open the sidebar with the booking belonging to the clicked event
   */
  const openSidebar = (id: string): void => {
    setSelectedBooking(findBooking(rooms, id));
  };

  const closeSidebar = (): void => {
    setSelectedBooking(null);
  };

  const onBeforeEventRender = (args: DayPilot.CalendarBeforeEventRenderArgs) => {
    args.data.areas = [];

    if (args.data.editable) {
      args.data.moveDisabled = false;
      args.data.resizeDisabled = false;
      args.data.clickDisabled = false;
      args.data.cssClass = "editable";
    } else {
      args.data.moveDisabled = true;
      args.data.resizeDisabled = true;
      args.data.clickDisabled = true;
    }
  };

  const onBeforeEventDomAdd = (args: DayPilot.CalendarBeforeEventDomAddArgs) => {
    args.element = (
      <Typography variant="body2" component="div">
        {args.e.data.text}
        { args.e.data.editable && (
            <IconButton
              aria-label="delete"
              size="small"
              onClick={() => {
                args.e.data.delete();
              }}
            >
              <Delete fontSize="inherit" />
            </IconButton>
        )}
        { args.e.data.editable && (
            <IconButton
              aria-label="edit"
              size="small"
              onClick={() => {
                args.e.data.edit();
              }}
            >
              <Edit fontSize="inherit" />
            </IconButton>
        )}
        <IconButton
          aria-label="info"
          size="small"
          onClick={() => openSidebar(String(args.e.id())) }
        >
          <Info fontSize="inherit" />
        </IconButton>
      </Typography>
    )
  }

  const headerHtml = (header: { name: string; toolTip: string }): string => {
    let description = "";
    if (header.toolTip.length > 20) {
      description = header.toolTip.substring(0, 20).concat("...");
    } else {
      description = header.toolTip;
    }
    return `<div><strong>${header.name}</strong><br/><span class="subtitle">${description}</div>`;
  };

  const selectedRoom = selectedBooking
    ? rooms.find((room) => room.canonicalName === selectedBooking.room)
    : undefined;

  const sidebar = selectedBooking
    ? (
      <BookingSidebar
        booking={selectedBooking}
        room={selectedRoom}
        onClose={closeSidebar}
      />
    )
    : null;

  const calendar = (
    <React.Fragment>
      <CalendarToolbar
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        clock={systemClock}
      />
      <RoomVisibiltyControls rooms={rooms} hidden={hidden} onToggle={toggle} />
      <DayPilotCalendar
        {...CALENDAR_CONFIG}
        startDate={startDate}
        columns={columns}
        events={events}
        onBeforeHeaderRender={(args) =>
          args.header.html = headerHtml(args.header)}
        onBeforeEventDomAdd={onBeforeEventDomAdd}
        onBeforeEventRender={onBeforeEventRender}
      />
    </React.Fragment>
  );

  if (isDesktop) {
    return (
      <Stack direction="row" spacing={2}>
        <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
          {calendar}
        </Stack>
        {sidebar && (
          <Box
            sx={{
              width: SIDEBAR_WIDTH,
              flexShrink: 0,
              p: 2,
              borderTop: 1,
              borderLeft: 1,
              borderBottom: 1,
              borderColor: "divider",
              borderRadius: (theme) =>
                `${theme.shape.borderRadius}px 0 0 ${theme.shape.borderRadius}px`,
            }}
          >
            {sidebar}
          </Box>
        )}
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      {calendar}
      <Drawer
        anchor="right"
        open={selectedBooking !== null}
        onClose={closeSidebar}
      >
        {sidebar && (
          <Box sx={{ p: 2, width: SIDEBAR_WIDTH, maxWidth: "100vw" }}>
            {sidebar}
          </Box>
        )}
      </Drawer>
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
      <Calendar rooms={rooms} />
    </Box>
  );
}
