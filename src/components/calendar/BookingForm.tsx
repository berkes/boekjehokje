/**
 * Booking form
 *
 * Rendered inside the SidebarShell when a free slot was selected on the
 * board, by click or drag (issue #15). Pre-filled with the selected room
 * and time range; the booker is the signed-in user and stays read-only.
 * The summary preview shows the event title the booking will get in the
 * calendar source. Confirming hands the booking to the calendar service,
 * which writes it to the calendar source. With a `booking` prop the same
 * form edits that booking instead (prefilled with its values, issue #14):
 * confirming updates the existing event rather than creating one.
 */
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import React, { useEffect, useState } from "react";
import { useUser } from "../../context/useUser.ts";
import {
  type Booking,
  findOverlaps,
  type NewBooking,
} from "../../services/index.ts";
import { ROOMS, UNKNOWN_ROOM } from "../../services/rooms.ts";
import { loadBookerContact, saveBookerContact } from "./bookerContact.ts";
import {
  type CalendarRoom,
  checkMargin,
  formatDateTimeLocal,
  isInvertedRange,
  isLongBooking,
  summaryPreview,
} from "./utils.tsx";

/**
 * Rooms offered in the select: all hardcoded rooms, except the Unknown
 * group that collects unmatched bookings
 */
const BOOKABLE_ROOMS = ROOMS.filter(
  (room) => room.canonicalName !== UNKNOWN_ROOM,
);

/**
 * Props for BookingForm component
 */
export interface BookingFormProps {
  /** All rooms with their bookings, to warn about overlaps and margins (issue #16, ADR-0006) */
  rooms: CalendarRoom[];
  /** The booking being edited; when set, the form updates it instead of creating one (#14) */
  booking?: Booking;
  /** Canonical name of the room the slot was selected in */
  initialRoom: string;
  /** Start of the selected slot */
  initialStart: Date;
  /** End of the selected slot */
  initialEnd: Date;
  /** Save the booking through the calendar service; with the edited booking's id when editing */
  onSubmit: (booking: NewBooking, bookingId?: string) => Promise<void>;
  /** Called whenever the draft (room/start/end) changes, so the board can preview it */
  onDraftChange?: (draft: { room: string; start: Date; end: Date }) => void;
}

/**
 * Booking form component
 * Controlled MUI fields, all UI text inline in Dutch. The five-minute
 * margin rule (ADR-0006) is applied here, no matter how the range was
 * entered: a zero-minute gap shows a warning. An overlap with existing
 * bookings shows a warning listing them (issue #16) — the user stays
 * free to confirm anyway, the app guides but never blocks (ADR-0002).
 */
export function BookingForm(
  {
    rooms,
    booking,
    initialRoom,
    initialStart,
    initialEnd,
    onSubmit,
    onDraftChange,
  }: BookingFormProps,
): React.JSX.Element {
  const { user } = useUser();
  const booker = user?.name ?? "";

  const [room, setRoom] = useState(initialRoom);
  const [from, setFrom] = useState(() => formatDateTimeLocal(initialStart));
  const [to, setTo] = useState(() => formatDateTimeLocal(initialEnd));
  const [contact, setContact] = useState(() => loadBookerContact());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roomConfig = BOOKABLE_ROOMS.find((r) => r.canonicalName === room);
  const preview = summaryPreview(roomConfig?.shortName ?? room, booker);

  // The booking being edited never counts as an overlap with itself
  const start = new Date(from);
  const end = new Date(to);
  const overlaps = findOverlaps(rooms, room, start, end)
    .filter((b) => b.id !== booking?.id);
  const roomBookings = rooms.find((r) => r.canonicalName === room)?.bookings
    .filter((b) => b.id !== booking?.id) ?? [];
  const margin = checkMargin(roomBookings, start, end);
  const longBooking = isLongBooking(start, end);
  const invertedRange = isInvertedRange(start, end);

  /**
   * Report the current draft to the board, so it can highlight the
   * selected slot and preview what is being booked
   */
  useEffect(() => {
    onDraftChange?.({
      room,
      start: new Date(from),
      end: new Date(to),
    });
  }, [room, from, to, onDraftChange]);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const trimmedContact = contact.trim();
      await onSubmit(
        {
          room,
          booker,
          contact: trimmedContact,
          start: new Date(from),
          end: new Date(to),
        },
        booking?.id,
      );
      saveBookerContact(trimmedContact);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit}>
      <FormControl fullWidth>
        <InputLabel id="booking-room-label">Ruimte</InputLabel>
        <Select
          labelId="booking-room-label"
          label="Ruimte"
          value={room}
          onChange={(event) => setRoom(event.target.value)}
        >
          {BOOKABLE_ROOMS.map((option) => (
            <MenuItem
              key={option.canonicalName}
              value={option.canonicalName}
            >
              {option.canonicalName} ({option.shortName})
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Van"
        type="datetime-local"
        value={from}
        onChange={(event) => setFrom(event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        fullWidth
      />
      <TextField
        label="Tot"
        type="datetime-local"
        value={to}
        onChange={(event) => setTo(event.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
        fullWidth
      />
      <TextField
        label="Boeker"
        value={booker}
        disabled
        fullWidth
      />
      <TextField
        label="Contact"
        value={contact}
        onChange={(event) => setContact(event.target.value)}
        helperText="E-mailadres of telefoonnummer"
        fullWidth
      />
      <TextField
        label="Samenvatting"
        value={preview}
        slotProps={{ htmlInput: { readOnly: true } }}
        fullWidth
      />
      {overlaps.length > 0 && (
        <Typography color="warning.main">
          Let op: deze boeking overlapt met{" "}
          {overlaps.map((b) => `"${b.booker || b.summary}"`).join(", ")}{" "}
          in deze ruimte. Je kunt desondanks boeken.
        </Typography>
      )}
      {invertedRange && (
        <Typography color="error">
          Van moet vóór Tot liggen.
        </Typography>
      )}
      {!invertedRange && longBooking && (
        <Typography color="warning.main">
          Let op: deze boeking is erg lang. Als dit de bedoeling is, is dat
          prima, maar check even dubbel of dit klopt.
        </Typography>
      )}
      {overlaps.length === 0 && margin.zeroGap && (
        <Typography color="warning.main">
          Let op: er zit geen 5 minuten tussen deze en een aansluitende boeking
          in deze ruimte.
        </Typography>
      )}
      {error && <Typography color="error">Opslaan mislukt: {error}</Typography>}
      <Button
        type="submit"
        variant="contained"
        disabled={isSubmitting || invertedRange}
      >
        {booking ? "Boeking bijwerken" : "Boeking aanmaken"}
      </Button>
    </Stack>
  );
}
