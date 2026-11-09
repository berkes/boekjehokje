/**
 * Room visibility controls
 *
 * One small chip per room column: filled blue when the column is
 * visible, outlined grey when hidden. Clicking a chip toggles the
 * column. Hiding every column is allowed; the calendar then
 * renders an empty grid.
 *
 * The Unknown room is set apart: it comes last, with extra
 * whitespace and a question mark icon.
 */
import { HelpOutlined } from "@mui/icons-material";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import React from "react";
import {
  type CalendarRoom,
  isUnknownRoom,
  roomDescription,
  roomLabel,
  withUnknownLast,
} from "./board.ts";

/**
 * Extra whitespace between the Unknown chip and the other chips
 */
const UNKNOWN_MARGIN = 2;

/**
 * Props for RoomVisibilityControls component
 */
export interface RoomVisibilityControlsProps {
  /** All rooms, in display order */
  rooms: CalendarRoom[];
  /** Canonical names of the hidden rooms */
  hidden: ReadonlySet<string>;
  /** Toggle the column of the given room */
  onToggle: (roomId: string) => void;
}

/**
 * Chips that toggle the visibility of the room columns
 */
export function RoomVisibilityControls(
  { rooms, hidden, onToggle }: RoomVisibilityControlsProps,
): React.JSX.Element {
  return (
    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: "wrap" }}>
      {withUnknownLast(rooms).map((room) => {
        const visible = !hidden.has(room.canonicalName);
        const unknown = isUnknownRoom(room);
        return (
          <Chip
            key={room.canonicalName}
            size="small"
            label={roomLabel(room)}
            variant={visible ? "filled" : "outlined"}
            color={visible ? "primary" : "default"}
            icon={unknown ? <HelpOutlined /> : undefined}
            onClick={() => onToggle(room.canonicalName)}
            title={roomDescription(room)}
            sx={unknown ? { ml: UNKNOWN_MARGIN } : undefined}
          />
        );
      })}
    </Stack>
  );
}
