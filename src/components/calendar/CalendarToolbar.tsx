/**
 * Calendar toolbar
 *
 * Date navigation for the calendar view: previous/today/next and
 * quick navigation to the working days of the current week.
 * Works with plain Date objects only; no third-party date library.
 */
import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import React from "react";
import {
  type Clock,
  isSameDay,
  longDateLabel,
  startOfWeek,
  weekdayOptions,
} from "../../utils/clock.ts";

/**
 * Minimum touch target for the quick navigation buttons
 */
const DAY_BUTTON_MIN_WIDTH = 44;

/**
 * Props for CalendarToolbar component
 */
export interface CalendarToolbarProps {
  /** Currently selected day */
  selectedDate: Date;
  /** Select another day */
  onSelectDate: (date: Date) => void;
  /** The injected clock, used for "today" and week calculation */
  clock: Clock;
}

/**
 * Calendar toolbar component
 */
export function CalendarToolbar(
  { selectedDate, onSelectDate, clock }: CalendarToolbarProps,
): React.JSX.Element {
  const now = clock.now();
  const weekDays = weekdayOptions(startOfWeek(now));
  const isPastDay = (day: Date): boolean =>
    day.getTime() < now.getTime() &&
    !isSameDay(day, now);

  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ alignItems: "center", flexWrap: "wrap", gap: 0.5 }}
    >
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
        onClick={() => onSelectDate(startOfDay(now))}
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
      {weekDays.map(({ label, date }) => (
        <Button
          key={date.getTime()}
          size="small"
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
      <Typography variant="body1" sx={{ ml: 1 }} aria-live="polite">
        {longDateLabel(selectedDate)}
      </Typography>
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

/**
 * Get the start of the day (midnight, local time)
 */
function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}
