/**
 * Calendar component: the wrapper around super-calendar
 *
 * This is the actual wrapper around the third-party super-calendar
 * (@super-calendar/dom): it owns the ResourceTimeline configuration and uses
 * the helpers in utils.tsx to translate between our domain model and
 * super-calendar's shapes. The rest of the app only sees the CalendarView
 * container.
 */
import {
  type Resource,
  type ResourceEventArgs,
  ResourceTimeline,
} from "@super-calendar/dom";
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
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useCalendar } from "../../hooks/useCalendar.ts";
import type { Booking, CalendarServicePort } from "../../services/index.ts";
import { systemClock } from "../../utils/clock.ts";
import { BookingSidebar, SIDEBAR_WIDTH } from "./BookingSidebar.tsx";
import { CalendarToolbar } from "./CalendarToolbar.tsx";
import { RoomVisibiltyControls } from "./RoomVisibiltyControls.tsx";
import { useRoomVisibility } from "./useRoomVisibility.ts";
import {
  applyMovedEvents,
  type BoardEvent,
  type BookingEventMeta,
  type CalendarRoom,
  EDITABLE_EVENT_BACKGROUND,
  findBooking,
  isCalendarResource,
  type MovedEvent,
  READ_ONLY_EVENT_BACKGROUND,
  READ_ONLY_EVENT_BORDER,
  toDomTheme,
  toEvents,
  toResources,
} from "./utils.tsx";

/**
 * Height of the board; the time track scrolls inside it
 */
const BOARD_HEIGHT = 640;

/**
 * First hour shown on the time axis, so the working day fits on screen
 * without scrolling. Bookings before this hour are outside the window.
 */
const START_HOUR = 8;

/**
 * Props for Calendar component
 */
export interface CalendarProps {
  /** Rooms with their bookings to display */
  rooms: CalendarRoom[];
}

/**
 * Actions an event bar can invoke, provided to the event renderer
 */
interface BoardActions {
  /** Show the booking details in the sidebar */
  openSidebar: (bookingId: string) => void;
  /** Start editing a booking (UI affordance until issue #14) */
  editBooking: (booking: Booking) => void;
  /** Delete a booking (UI affordance until issue #14) */
  deleteBooking: (booking: Booking) => void;
}

/**
 * Passes the board actions to the event renderer without changing its
 * identity, so super-calendar can treat it as a stable component.
 */
const BoardActionsContext = createContext<BoardActions | null>(null);

/**
 * Event bar with the booking name and the info, edit and delete buttons.
 * Own bookings get a green background; others a muted grey one (issue #13).
 *
 * Rendered inside the library's event button, so the icon buttons render as
 * spans (nested buttons are invalid HTML) and stop pointer events from
 * starting a bar drag.
 */
function BoardEventBar(
  { event }: ResourceEventArgs<BookingEventMeta>,
): React.JSX.Element {
  const actions = useContext(BoardActionsContext);
  if (actions === null) {
    throw new Error(
      "BoardEventBar renders only inside BoardActionsContext.Provider",
    );
  }
  const { openSidebar, editBooking, deleteBooking } = actions;
  const { booking, editable } = event;

  return (
    <Box
      title={booking.summary}
      sx={{
        height: "100%",
        p: "2px 6px",
        borderRadius: 0.5,
        overflow: "hidden",
        backgroundColor: editable
          ? EDITABLE_EVENT_BACKGROUND
          : READ_ONLY_EVENT_BACKGROUND,
        border: editable ? undefined : `1px solid ${READ_ONLY_EVENT_BORDER}`,
      }}
    >
      <Typography
        variant="body2"
        component="div"
        noWrap
        sx={{
          color: editable ? "text.primary" : "text.secondary",
        }}
      >
        {event.title}
        <IconButton
          component="span"
          aria-label="delete"
          size="small"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            deleteBooking(booking);
          }}
          sx={{ display: editable ? "inline-flex" : "none" }}
        >
          <Delete fontSize="inherit" />
        </IconButton>
        <IconButton
          component="span"
          aria-label="edit"
          size="small"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            editBooking(booking);
          }}
          sx={{ display: editable ? "inline-flex" : "none" }}
        >
          <Edit fontSize="inherit" />
        </IconButton>
        <IconButton
          component="span"
          aria-label="info"
          size="small"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            openSidebar(booking.id);
          }}
        >
          <Info fontSize="inherit" />
        </IconButton>
      </Typography>
    </Box>
  );
}

/**
 * Calendar component
 * Maps rooms to super-calendar resources and bookings to board events.
 * Pressing an event opens the booking sidebar; own bookings can be
 * dragged and resized (UI-only, persistence is issue #14).
 */
export function Calendar({ rooms }: CalendarProps): React.JSX.Element {
  const [selectedDate, setSelectedDate] = useState(() => systemClock.now());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [moved, setMoved] = useState<ReadonlyMap<string, MovedEvent>>(
    () => new Map(),
  );

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const { rooms: visibleRooms, hidden, toggle } = useRoomVisibility(rooms);

  /** Fresh data from Google Calendar discards local drag changes */
  useEffect(() => {
    setMoved((prev) => prev.size === 0 ? prev : new Map());
  }, [rooms]);

  const resources = useMemo(() => toResources(visibleRooms), [visibleRooms]);
  const domTheme = useMemo(() => toDomTheme(theme.palette), [theme.palette]);
  const events = useMemo(
    () => applyMovedEvents(toEvents(visibleRooms), moved),
    [visibleRooms, moved],
  );

  /**
   * Open the sidebar with the booking belonging to the pressed event
   */
  const openSidebar = useCallback(
    (bookingId: string): void => {
      setSelectedBooking(findBooking(rooms, bookingId));
    },
    [rooms],
  );

  /**
   * Editing and deleting are UI affordances until persistence lands
   * (issue #14). Edit shows the booking in the sidebar; delete is a no-op.
   */
  const boardActions = useMemo<BoardActions>(
    () => ({
      openSidebar,
      editBooking: (booking: Booking) => openSidebar(booking.id),
      deleteBooking: (booking: Booking) => {
        console.info("Verwijderen is nog niet beschikbaar.", booking.id);
      },
    }),
    [openSidebar],
  );

  /**
   * Own bookings can be moved and resized on the board, others snap back.
   * The change is applied locally only; persistence is issue #14.
   * The drop lane retargets the room, the basis for cross-room moves.
   */
  const onDragEvent = (
    event: BoardEvent,
    start: Date,
    end: Date,
    resource: Resource,
  ): void | boolean => {
    if (!event.editable) return false;
    setMoved((prev) => {
      const next = new Map(prev);
      next.set(event.booking.id, { start, end, resourceId: resource.id });
      return next;
    });
  };

  /**
   * Room column header: the short name with the description as subtitle,
   * the full description as tooltip. Overflow is clipped by the header
   * cell, so long descriptions need no manual truncation.
   */
  const renderResourceHeader = useCallback(
    (resource: Resource): React.JSX.Element => {
      const description = isCalendarResource(resource)
        ? resource.description
        : resource.title ?? resource.id;
      return (
        <Box
          title={description}
          sx={{ width: "100%", overflow: "hidden", px: 0.5 }}
        >
          <Typography
            variant="body2"
            component="div"
            noWrap
            sx={{ fontWeight: 600 }}
          >
            {resource.title ?? resource.id}
          </Typography>
          <Typography
            variant="caption"
            component="div"
            noWrap
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            {description}
          </Typography>
        </Box>
      );
    },
    [],
  );

  const selectedRoom = selectedBooking
    ? rooms.find((room) => room.canonicalName === selectedBooking.room)
    : undefined;

  const sidebar = selectedBooking
    ? (
      <BookingSidebar
        booking={selectedBooking}
        room={selectedRoom}
        onClose={() => setSelectedBooking(null)}
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
      <BoardActionsContext.Provider value={boardActions}>
        <ResourceTimeline<BookingEventMeta>
          orientation="vertical"
          date={selectedDate}
          startHour={START_HOUR}
          resources={resources}
          events={events}
          theme={domTheme}
          style={{ height: BOARD_HEIGHT }}
          renderEvent={BoardEventBar}
          renderResourceHeader={renderResourceHeader}
          onPressEvent={(event) => openSidebar(event.booking.id)}
          onDragEvent={onDragEvent}
        />
      </BoardActionsContext.Provider>
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
        onClose={() => setSelectedBooking(null)}
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

interface CalendarViewProps {
  service: CalendarServicePort;
}

/**
 * Calendar view component
 * Fetches rooms with their bookings and renders the calendar
 * with loading, error and empty states
 */
export function CalendarView(
  { service }: CalendarViewProps,
): React.JSX.Element {
  const { load, rooms, isLoading, error } = useCalendar(service);

  /**
   * Initial load on mount
   */
  useEffect(() => {
    load();
  }, [load]);

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
        <Button variant="contained" onClick={load}>
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
