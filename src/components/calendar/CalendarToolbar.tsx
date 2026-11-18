/**
 * Calendar toolbar
 *
 * Date navigation for the calendar view: previous/today/next and
 * quick navigation to the working days of the current week.
 * Works with plain Date objects only; no third-party date library.
 *
 * Two layouts (issue #63): "row" lays everything out in one wrapping
 * row (desktop); "column" stacks the long date first — tapping it jumps
 * to today — then the previous/today/next buttons and the day buttons,
 * for the slide-in navigation drawer on mobile.
 */
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import React from "react";
import {
  type ClockPort,
  isSameDay,
  longDateLabel,
  startOfDay,
  startOfWeek,
  weekdayOptions,
} from "../../services/index.ts";

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
  /** "row" for the desktop bar, "column" stacked date-first for the mobile drawer */
  layout?: "row" | "column";
}

/**
 * Calendar toolbar component
 */
export function CalendarToolbar(
  { selectedDate, onSelectDate, clock, layout = "row" }: CalendarToolbarProps,
): React.JSX.Element {
  const now = clock.now();
  const weekDays = weekdayOptions(startOfWeek(now));
  const isPastDay = (day: Date): boolean =>
    day.getTime() < now.getTime() &&
    !isSameDay(day, now);
  const goToday = (): void => onSelectDate(startOfDay(now));

  /**
   * The long date label; tapping it jumps back to today (issue #63).
   * In the row layout it carries the aria-live region announcing the
   * shown day.
   */
  const dateButton = (
    <Button
      variant="text"
      size="small"
      onClick={goToday}
      aria-live={layout === "row" ? "polite" : undefined}
      sx={{
        color: "text.primary",
        textTransform: "none",
        fontSize: "1rem",
        ...(layout === "row" ? { ml: 1 } : null),
      }}
    >
      {longDateLabel(selectedDate)}
    </Button>
  );

  const navigationButtons = (
    <React.Fragment>
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
    </React.Fragment>
  );

  const dayButtons = weekDays.map(({ label, date }) => (
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
  ));

  if (layout === "column") {
    return (
      <Stack spacing={1} sx={{ alignItems: "flex-start" }}>
        {dateButton}
        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          {navigationButtons}
        </Stack>
        <Stack
          direction="row"
          spacing={0.5}
          useFlexGap
          sx={{ flexWrap: "wrap" }}
        >
          {dayButtons}
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}
    >
      {navigationButtons}
      {dayButtons}
      {dateButton}
    </Stack>
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
