/*
*
 * Calendar toolbar
 *
 * Date navigation for the calendar view: previous/today/next and
 * quick navigation to the working days of the current week.
 * Works with plain Date objects only; no third-party date library.
 *
 * The navigation is a collapsible block (review of #63): a header row
 * with a chevron in its expanded/collapsed state plus the long date
 * (tapping the date jumps to today), controlling the navigation
 * buttons below it. All viewports are styled the same; the only
 * difference is the default state — open on desktop, closed on mobile.
 * The expanded/collapsed state lives in memory only, it is not
 * persisted.
 */
import {
  ChevronLeft,
  ChevronRight,
  ExpandLess,
  ExpandMore,
} from "@mui/icons-material";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import React from "react";
import {
  type ClockPort,
  isSameDay,
  longDateLabel,
  startOfDay,
  startOfWeek,
  weekdayOptions
} from "../../services/index.ts";
import { type CalendarRoom } from "./board.ts";
import { RoomVisibilityControls } from "./RoomVisibilityControls.tsx";

/**
 * Minimum touch target for the quick navigation buttons
 */
const DAY_BUTTON_MIN_WIDTH = 34;

/**
 * Props for CalendarToolbar component
 */
export interface CalendarToolbarProps {
  /** Currently selected day */
  selectedDate: Date;
  /** Select another day */
  onSelectDate: (date: Date) => void;
  /** The injected clock, used for "today" and week calculation */
  clock: ClockPort;
  /**
   * Whether the navigation block is expanded. The state lives in
   * memory only (it starts open on desktop, closed on mobile), it is
   * not persisted
   */
  open: boolean;
  /** Toggle the navigation block expanded/collapsed */
  onToggleOpen: () => void;

  /** Rooms to display */
  rooms: CalendarRoom[];
  /** Hidden rooms */
  roomHidden: ReadonlySet<string>;
  /** Toggle room visibility */
  onToggleRoom: (roomId: string) => void;
}

/**
 * Calendar toolbar component
 */
export function CalendarToolbar(
  { selectedDate, onSelectDate, clock, open, onToggleOpen, rooms, roomHidden, onToggleRoom }:
    CalendarToolbarProps,
): React.JSX.Element {
  const now = clock.now();
  const weekDays = weekdayOptions(startOfWeek(now));
  const isPastDay = (day: Date): boolean =>
    day.getTime() < now.getTime() &&
    !isSameDay(day, now);
  const goToday = (): void => onSelectDate(startOfDay(now));

  const navigationButtons = (
    <Stack direction="row" spacing={0.5}>
      <IconButton
        size="small"
        aria-label="Vorige"
        onClick={() => onSelectDate(addDays(selectedDate, -1))}
      >
        <ChevronLeft />
      </IconButton>
      <Button
        variant="outlined"
        size="small"
        onClick={goToday}
      >
        Vandaag
      </Button>
      <IconButton
        size="small"
        aria-label="Volgende"
        onClick={() => onSelectDate(addDays(selectedDate, 1))}
      >
        <ChevronRight />
      </IconButton>
    </Stack>
  );

  const dayButtons = (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ justifyContent: "left" }}
    >
      { weekDays.map(({ label, date }) => (
        <Button
          key={date.getTime()}
          size="small"
          aria-label={longDateLabel(date)}
          variant={isSameDay(date, selectedDate) ? "contained" : "outlined"}
          onClick={() => onSelectDate(date)}
          sx={{
            minWidth: DAY_BUTTON_MIN_WIDTH,
            ...(isPastDay(date) && !isSameDay(date, selectedDate) && {
              color: "text.disabled",
              borderColor: "action.disabledBackground",
            }),
          }}
        >
          {label}
        </Button>
      ))}
    </Stack>
  );

  return (
    <Box>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        <IconButton
          size="small"
          aria-label="Kalendernavigatie"
          aria-expanded={open}
          onClick={onToggleOpen}
        >
          {open ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
        <Button
          variant="text"
          size="small"
          onClick={goToday}
          aria-live="polite"
          sx={{
            color: "text.primary",
            textTransform: "none",
            fontSize: "1rem",
          }}
        >
          {longDateLabel(selectedDate)}
        </Button>
      </Stack>
      <Collapse in={open}>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignItems: "left", flexWrap: "wrap", gap: 0.5, pt: 0.5, mb: 2, ml: 0}}
        >
          {navigationButtons}
          {dayButtons}
        </Stack>
        <RoomVisibilityControls
          rooms={rooms}
          hidden={roomHidden}
          onToggle={onToggleRoom}
        />
      </Collapse>
    </Box>
  );
}

/**
 * Add whole days to a date, keeping the time of day
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
