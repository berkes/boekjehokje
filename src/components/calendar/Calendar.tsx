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
import { Add, Delete, Edit, Info } from "@mui/icons-material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
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
import {
  useCalendarService,
  useClock,
  useOverlapsService,
} from "../../hooks/useServices.ts";
import { useRoomVisibility } from "../../hooks/useRoomVisibility.ts";
import {
  type Booking,
  type BookingUpdate,
  isSameDay,
  type NewBooking,
} from "../../services/index.ts";
import { BookingForm } from "./BookingForm.tsx";
import { BookingSidebar } from "./BookingSidebar.tsx";
import { CalendarToolbar } from "./CalendarToolbar.tsx";
import { SidebarShell } from "./SidebarShell.tsx";
import { RoomVisibilityControls } from "./RoomVisibilityControls.tsx";
import {
  applyMovedEvents,
  type BoardEvent,
  type BoardEventMeta,
  type CalendarRoom,
  CONFLICT_EVENT_BACKGROUND,
  CONFLICT_EVENT_BORDER,
  defaultSlotAt,
  EDITABLE_EVENT_BACKGROUND,
  findBooking,
  FREE_SLOT_BACKGROUND,
  FREE_SLOT_BORDER,
  FREE_SLOT_CONFLICT_BACKGROUND,
  FREE_SLOT_CONFLICT_BORDER,
  FREE_SLOT_PREVIEW_BACKGROUND,
  FREE_SLOT_PREVIEW_BORDER,
  FREE_SLOT_SELECTED_BACKGROUND,
  FREE_SLOT_SELECTED_BORDER,
  isCalendarResource,
  markConflicts,
  type MovedEvent,
  READ_ONLY_EVENT_BACKGROUND,
  READ_ONLY_EVENT_BORDER,
  toDomTheme,
  toEvents,
  toFreeSlotEvents,
  toPreviewEvent,
  toResources,
} from "./board.ts";

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
  /** The day the board shows; switching it reloads the calendar */
  selectedDate: Date;
  /** Select another day (previous/next/today/quick buttons) */
  onSelectDate: (date: Date) => void;
  /** Save a new booking through the calendar service (issue #15) */
  onCreateBooking: (booking: NewBooking) => Promise<void>;
  /** Save changes to an existing booking through the calendar service (#14) */
  onUpdateBooking: (booking: BookingUpdate) => Promise<void>;
  /** Delete a booking through the calendar service (#14); undo is #36 */
  onDeleteBooking: (bookingId: string) => Promise<void>;
}

/**
 * What the sidebar shows: the details of a booking, or the booking form
 * pre-filled from a selected free slot
 */
type SidebarState = {
  mode: "details";
  booking: Booking;
} | {
  mode: "create";
  /** Current draft values, edited in the form */
  room: string;
  start: Date;
  end: Date;
  /** The free-slot block that was originally selected (room included), highlighted on the board */
  slot: { room: string; start: Date; end: Date };
} | {
  mode: "edit";
  /** The booking being edited; the form is prefilled from it */
  booking: Booking;
  /** Current draft values, edited in the form */
  room: string;
  start: Date;
  end: Date;
} | null;

/**
 * Actions an event bar can invoke, provided to the event renderer
 */
interface BoardActions {
  /** Show the booking details in the sidebar */
  openSidebar: (bookingId: string) => void;
  /** Open the booking form prefilled with the booking's values (#14) */
  editBooking: (booking: Booking) => void;
  /** Delete a booking immediately, no confirmation (undo is #36) */
  deleteBooking: (booking: Booking) => void;
}

/**
 * Passes the board actions to the event renderer without changing its
 * identity, so super-calendar can treat it as a stable component.
 */
const BoardActionsContext = createContext<BoardActions | null>(null);

/**
 * Event bar with the booking name and the info, edit and delete buttons.
 * Own bookings get a green background; others a muted grey one (issue #13);
 * a booking overlapping another booking of the room is red (issue #16).
 *
 * Rendered inside the library's event button, so the icon buttons render as
 * spans (nested buttons are invalid HTML) and stop pointer events from
 * starting a bar drag.
 */
function BoardEventBar(
  { event }: ResourceEventArgs<BoardEventMeta>,
): React.JSX.Element {
  if (event.freeSlot) {
    return <FreeSlotBar event={event} />;
  }
  const actions = useContext(BoardActionsContext);
  if (actions === null) {
    throw new Error(
      "BoardEventBar renders only inside BoardActionsContext.Provider",
    );
  }
  const { openSidebar, editBooking, deleteBooking } = actions;
  const booking = event.booking;
  if (!booking) {
    throw new Error("BoardEventBar got a non-booking event without freeSlot");
  }
  const editable = event.editable ?? false;
  const conflict = event.conflict === true;

  return (
    <Box
      title={booking.summary}
      data-booking-conflict={conflict ? "true" : undefined}
      sx={{
        height: "100%",
        p: "2px 6px",
        borderRadius: 0.5,
        overflow: "hidden",
        backgroundColor: conflict
          ? CONFLICT_EVENT_BACKGROUND
          : editable
          ? EDITABLE_EVENT_BACKGROUND
          : READ_ONLY_EVENT_BACKGROUND,
        border: conflict
          ? `1px solid ${CONFLICT_EVENT_BORDER}`
          : editable
          ? undefined
          : `1px solid ${READ_ONLY_EVENT_BORDER}`,
      }}
    >
      <Typography
        variant="body2"
        component="div"
        noWrap
        sx={{
          color: conflict
            ? "error.dark"
            : editable
            ? "text.primary"
            : "text.secondary",
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
 * A free-slot block on the board: painted green with a plus icon and a
 * "Nu boeken" tooltip, marking it as a slot for booking (ADR-0006).
 * Pressing it (handled via onPressEvent) opens the booking form with the
 * block's exact range.
 */
function FreeSlotBar(
  { event }: { event: BoardEvent },
): React.JSX.Element {
  const selected = event.selected === true;
  const preview = event.preview === true;
  const disabled = event.disabled === true;
  const conflict = event.conflict === true;
  return (
    <Box
      title={conflict ? "Overlapt met een bestaande boeking" : "Nu boeken"}
      data-slot-selected={selected ? "true" : undefined}
      data-slot-preview={preview ? "true" : undefined}
      data-slot-disabled={disabled ? "true" : undefined}
      data-slot-conflict={conflict ? "true" : undefined}
      sx={{
        cursor: disabled ? "default" : undefined,
        opacity: disabled && !selected && !preview ? 0.45 : undefined,
        height: "100%",
        p: "2px 6px",
        borderRadius: 0.5,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        backgroundColor: conflict
          ? FREE_SLOT_CONFLICT_BACKGROUND
          : selected
          ? FREE_SLOT_SELECTED_BACKGROUND
          : preview
          ? FREE_SLOT_PREVIEW_BACKGROUND
          : FREE_SLOT_BACKGROUND,
        border: conflict
          ? `2px solid ${FREE_SLOT_CONFLICT_BORDER}`
          : selected
          ? `2px solid ${FREE_SLOT_SELECTED_BORDER}`
          : preview
          ? `2px solid ${FREE_SLOT_PREVIEW_BORDER}`
          : `1px dashed ${FREE_SLOT_BORDER}`,
        color: conflict ? "error.dark" : "success.dark",
      }}
    >
      <Add fontSize="inherit" />
      <Typography variant="caption" component="span" noWrap>
        {event.title}
      </Typography>
    </Box>
  );
}

/**
 * Calendar component
 * Maps rooms to super-calendar resources and bookings to board events, and
 * paints every bookable free slot as a green block (ADR-0006). Pressing a
 * booking opens its details in the sidebar; pressing a free-slot block, or
 * pressing or dragging empty lane space, opens the booking form in the same
 * sidebar (issue #15); the edit icon opens the same form prefilled with
 * the booking's values and the delete icon deletes immediately (#14).
 * Events whose range overlaps another booking of the room — existing
 * double bookings as well as the selected or previewed slot — are marked
 * red on the board, next to the form's overlap warning (issue #16).
 */
export function Calendar(
  {
    rooms,
    selectedDate,
    onSelectDate,
    onCreateBooking,
    onUpdateBooking,
    onDeleteBooking,
  }: CalendarProps,
): React.JSX.Element {
  const [sidebarState, setSidebarState] = useState<SidebarState>(null);
  const [moved, setMoved] = useState<ReadonlyMap<string, MovedEvent>>(
    () => new Map(),
  );

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const clock = useClock();
  const overlaps = useOverlapsService();

  const { rooms: visibleRooms, hidden, toggle } = useRoomVisibility(rooms);

  /** Fresh data from Google Calendar discards local drag changes */
  useEffect(() => {
    setMoved((prev) => prev.size === 0 ? prev : new Map());
  }, [rooms]);

  const resources = useMemo(() => toResources(visibleRooms), [visibleRooms]);
  const domTheme = useMemo(() => toDomTheme(theme.palette), [theme.palette]);
  const formOpen = sidebarState?.mode === "create" ||
    sidebarState?.mode === "edit";
  const selectedSlot = sidebarState?.mode === "create"
    ? sidebarState.slot
    : null;
  const previewEvent = sidebarState?.mode === "create"
    ? toPreviewEvent(
      {
        room: sidebarState.room,
        start: sidebarState.start,
        end: sidebarState.end,
      },
      visibleRooms,
      selectedSlot,
    )
    : null;
  /**
   * The booking being edited never counts as an overlap with itself
   * (issue #16)
   */
  const editedBookingId = sidebarState?.mode === "edit"
    ? sidebarState.booking.id
    : undefined;

  const events = useMemo(
    () =>
      markConflicts(
        [
          ...applyMovedEvents(toEvents(visibleRooms), moved),
          ...toFreeSlotEvents(
            visibleRooms,
            selectedDate,
            clock.now(),
            selectedSlot,
          ).map((event) => ({ ...event, disabled: formOpen })),
          ...(previewEvent ? [previewEvent] : []),
        ],
        rooms,
        overlaps,
        editedBookingId,
      ),
    [
      visibleRooms,
      rooms,
      moved,
      selectedDate,
      selectedSlot,
      previewEvent,
      formOpen,
      editedBookingId,
      clock,
      overlaps,
    ],
  );

  /**
   * Open the sidebar with the booking belonging to the pressed event
   */
  const openSidebar = useCallback(
    (bookingId: string): void => {
      const booking = findBooking(rooms, bookingId);
      if (booking) {
        setSidebarState({ mode: "details", booking });
      }
    },
    [rooms],
  );

  /**
   * Pressing a booking opens its details; pressing a free-slot block opens
   * the booking form with exactly that block's range
   */
  const onPressBoardEvent = useCallback(
    (event: BoardEvent): void => {
      // Free-slot blocks are disabled while the booking form is open
      if (event.freeSlot && formOpen) return;
      if (event.freeSlot) {
        setSidebarState({
          mode: "create",
          room: event.resourceId,
          start: event.freeSlot.start,
          end: event.freeSlot.end,
          slot: { room: event.resourceId, ...event.freeSlot },
        });
      } else if (event.booking) {
        openSidebar(event.booking.id);
      }
    },
    [openSidebar, formOpen],
  );

  /**
   * A click on empty lane space opens the booking form with the default
   * slot for that free slot (ADR-0006): starting at the whole hour or five
   * minutes after the preceding booking, ending five to the hour; a drag
   * opens it with the exact swept range
   */
  const onPressCell = useCallback(
    (at: Date, resource: Resource): void => {
      // While the booking form is open, clicks on the board do nothing:
      // the form keeps the user's edits
      if (formOpen) return;
      const roomBookings =
        rooms.find((room) => room.canonicalName === resource.id)?.bookings ??
          [];
      const slot = defaultSlotAt(at, roomBookings);
      setSidebarState({
        mode: "create",
        room: resource.id,
        start: slot.start,
        end: slot.end,
        slot: { room: resource.id, start: slot.start, end: slot.end },
      });
    },
    [rooms, formOpen],
  );

  const onCreateEvent = useCallback(
    (start: Date, end: Date, resource: Resource): void => {
      if (formOpen) return;
      setSidebarState({
        mode: "create",
        room: resource.id,
        start,
        end,
        slot: { room: resource.id, start, end },
      });
    },
    [formOpen],
  );

  /**
   * The booking form's draft changed: update the form state, so the
   * board can highlight the selected slot and preview the draft
   */
  const handleDraftChange = useCallback(
    (draft: { room: string; start: Date; end: Date }): void => {
      setSidebarState((prev) =>
        prev?.mode === "create" || prev?.mode === "edit"
          ? { ...prev, room: draft.room, start: draft.start, end: draft.end }
          : prev
      );
    },
    [],
  );

  /**
   * Confirming the booking form saves it through the calendar service and
   * closes the sidebar; the service persists it to the calendar source.
   * With a booking id the form edits that booking, without it creates one.
   */
  const handleFormSubmit = useCallback(
    async (booking: NewBooking, bookingId?: string): Promise<void> => {
      if (bookingId === undefined) {
        await onCreateBooking(booking);
      } else {
        await onUpdateBooking({ ...booking, id: bookingId });
      }
      setSidebarState(null);
    },
    [onCreateBooking, onUpdateBooking],
  );

  /**
   * The edit icon opens the same form as create, prefilled with the
   * booking's values; the delete icon deletes immediately, without
   * confirmation (a timed undo is issue #36)
   */
  const boardActions = useMemo<BoardActions>(
    () => ({
      openSidebar,
      editBooking: (booking: Booking) => {
        setSidebarState({
          mode: "edit",
          booking,
          room: booking.room,
          start: booking.start,
          end: booking.end,
        });
      },
      deleteBooking: (booking: Booking) => {
        onDeleteBooking(booking.id)
          .catch((err: unknown) => console.error("Verwijderen mislukt:", err))
          .then(() =>
            setSidebarState((prev) =>
              prev?.mode === "details" && prev.booking.id === booking.id
                ? null
                : prev
            )
          );
      },
    }),
    [openSidebar, onDeleteBooking],
  );

  /**
   * Own bookings can be moved and resized on the board, others snap back.
   * The change is applied locally only for now; the drop lane retargets
   * the room, the basis for cross-room moves.
   */
  const onDragEvent = (
    event: BoardEvent,
    start: Date,
    end: Date,
    resource: Resource,
  ): void | boolean => {
    if (event.freeSlot || !event.booking || !event.editable) return false;
    setMoved((prev) => {
      const next = new Map(prev);
      next.set(event.booking!.id, { start, end, resourceId: resource.id });
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

  const detailsBooking = sidebarState?.mode === "details"
    ? sidebarState.booking
    : null;
  const selectedRoom = detailsBooking
    ? rooms.find((room) => room.canonicalName === detailsBooking.room)
    : undefined;

  const sidebar = sidebarState === null
    ? null
    : sidebarState.mode === "details"
    ? <BookingSidebar booking={sidebarState.booking} room={selectedRoom} />
    : (
      <BookingForm
        rooms={rooms}
        booking={sidebarState.mode === "edit"
          ? sidebarState.booking
          : undefined}
        initialRoom={sidebarState.room}
        initialStart={sidebarState.start}
        initialEnd={sidebarState.end}
        onDraftChange={handleDraftChange}
        onSubmit={handleFormSubmit}
      />
    );

  const sidebarTitle = sidebarState === null
    ? ""
    : sidebarState.mode === "details"
    ? `${
      sidebarState.booking.booker || sidebarState.booking.summary
    } — ${sidebarState.booking.room}`
    : sidebarState.mode === "edit"
    ? "Boeking bewerken"
    : "Nieuwe boeking";

  const closeSidebar = (): void => setSidebarState(null);

  const sidebarShell = (
    <SidebarShell
      open={sidebarState !== null}
      title={sidebarTitle}
      onClose={closeSidebar}
    >
      {sidebar}
    </SidebarShell>
  );

  const calendar = (
    <React.Fragment>
      <CalendarToolbar
        selectedDate={selectedDate}
        onSelectDate={onSelectDate}
        clock={clock}
      />
      <RoomVisibilityControls rooms={rooms} hidden={hidden} onToggle={toggle} />
      <BoardActionsContext.Provider value={boardActions}>
        <ResourceTimeline<BoardEventMeta>
          orientation="vertical"
          date={selectedDate}
          startHour={START_HOUR}
          resources={resources}
          events={events}
          theme={domTheme}
          style={{ height: BOARD_HEIGHT }}
          renderEvent={BoardEventBar}
          renderResourceHeader={renderResourceHeader}
          onPressEvent={onPressBoardEvent}
          onDragEvent={onDragEvent}
          onPressCell={onPressCell}
          onCreateEvent={onCreateEvent}
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
        {sidebarShell}
      </Stack>
    );
  }

  return (
    <Stack spacing={1}>
      {calendar}
      {sidebarShell}
    </Stack>
  );
}

/**
 * Calendar view component
 * Fetches rooms with their bookings through the calendar service (from the
 * service tree, via the useCalendar hook) and renders the calendar with
 * loading, error and empty states
 */
export function CalendarView(): React.JSX.Element {
  const { load, rooms, isLoading, error } = useCalendar();
  const clock = useClock();
  const [selectedDate, setSelectedDate] = useState(() => clock.now());

  /**
   * (Re)load the board whenever the selected day changes: on mount and
   * when the user switches days (previous/next/today/quick buttons)
   */
  useEffect(() => {
    load(selectedDate);
  }, [load, selectedDate]);

  /**
   * Switch the day the board shows; selecting the day already shown does
   * not trigger a reload
   */
  const selectDate = useCallback((date: Date): void => {
    setSelectedDate((previous) => isSameDay(previous, date) ? previous : date);
  }, []);

  /**
   * Saving, updating or deleting a booking goes through the service port
   * and refreshes the shown day afterwards; the service persists it to
   * the calendar source
   */
  const service = useCalendarService();

  const createBooking = useCallback(
    async (booking: NewBooking): Promise<void> => {
      await service.createBooking(booking);
      await load(selectedDate);
    },
    [service, load, selectedDate],
  );

  const updateBooking = useCallback(
    async (booking: BookingUpdate): Promise<void> => {
      await service.updateBooking(booking);
      await load(selectedDate);
    },
    [service, load, selectedDate],
  );

  const deleteBooking = useCallback(
    async (bookingId: string): Promise<void> => {
      await service.deleteBooking(bookingId);
      await load(selectedDate);
    },
    [service, load, selectedDate],
  );

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
        <Button variant="contained" onClick={() => load(selectedDate)}>
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
      <Calendar
        rooms={rooms}
        selectedDate={selectedDate}
        onSelectDate={selectDate}
        onCreateBooking={createBooking}
        onUpdateBooking={updateBooking}
        onDeleteBooking={deleteBooking}
      />
    </Box>
  );
}
