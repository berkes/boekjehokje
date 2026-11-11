/**
 * Booking form
 *
 * Rendered inside the SidebarShell when a free slot was selected on the
 * board, by click or drag (issue #15). Pre-filled with the selected room
 * and time range; the editable booker name comes from the user's booking
 * preferences (issue #18), initially the signed-in user's Google profile
 * name, and is stored back on confirm. When editing a booking, it
 * pre-fills from that booking's booker. The contact is pre-filled from
 * the last-used value in the preferences.
 * The summary preview shows the event title the booking will get in the
 * calendar source. Confirming hands the booking to the calendar service,
 * which writes it to the calendar source. With a `booking` prop the same
 * form edits that booking instead (prefilled with its values, issue #14):
 * confirming updates the existing event rather than creating one.
 */
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import React, { useEffect, useState } from "react";
import {
  useEventFormatService,
  useOverlapsService,
  usePreferences,
  useRoomsService,
  useSession,
} from "../../hooks/index.ts";
import { type Booking, type NewBooking } from "../../services/index.ts";
import {
  type CalendarRoom,
  checkMargin,
  formatDateTimeLocal,
  isInvertedRange,
  isLongBooking,
} from "./board.ts";

/**
 * Props for BookingForm component
 */

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
  const { user } = useSession();
  const preferences = usePreferences();
  const roomsService = useRoomsService();
  const overlaps = useOverlapsService();
  const eventFormat = useEventFormatService();
  const [room, setRoom] = useState(initialRoom);
  const [from, setFrom] = useState(() => formatDateTimeLocal(initialStart));
  const [to, setTo] = useState(() => formatDateTimeLocal(initialEnd));
  const [booker, setBooker] = useState(() =>
    booking?.booker ?? (preferences.getBookerName() || user?.name || "")
  );
  const [contact, setContact] = useState(() => preferences.getBookerContact());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The booking being edited never counts as an overlap with itself
  const start = new Date(from);
  const end = new Date(to);
  const preview = eventFormat.serialize({ room, booker, start, end }).summary;
  const conflicting = overlaps.findOverlaps(rooms, room, start, end)
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
      const trimmedBooker = booker.trim();
      const trimmedContact = contact.trim();
      await onSubmit(
        {
          room,
          booker: trimmedBooker,
          contact: trimmedContact,
          start: new Date(from),
          end: new Date(to),
        },
        booking?.id,
      );
      preferences.saveBookerName(trimmedBooker);
      preferences.saveBookerContact(trimmedContact);
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
          {roomsService.bookable().map((option) => (
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
        onChange={(event) => setBooker(event.target.value)}
        helperText="Deze naam wordt bij je boekingen opgeslagen"
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
        disabled
        fullWidth
      />
      {conflicting.length > 0 && (
        <Alert severity="warning">
          Let op: deze boeking overlapt met{" "}
          {conflicting.map((b) => `"${b.booker || b.summary}"`).join(", ")}{" "}
          in deze ruimte. Je kunt desondanks boeken.
        </Alert>
      )}
      {invertedRange && (
        <Alert severity="error">Van moet vóór Tot liggen.</Alert>
      )}
      {!invertedRange && longBooking && (
        <Alert severity="warning">
          Let op: deze boeking is erg lang. Als dit de bedoeling is, is dat
          prima, maar check even dubbel of dit klopt.
        </Alert>
      )}
      {conflicting.length === 0 && margin.zeroGap && (
        <Alert severity="warning">
          Let op: er zit geen 5 minuten tussen deze en een aansluitende boeking
          in deze ruimte.
        </Alert>
      )}
      {error && <Alert severity="error">Opslaan mislukt: {error}</Alert>}
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
