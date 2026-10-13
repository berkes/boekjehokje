/**
 * Room list component
 *
 * Displays a list of all rooms with their bookings for the current week.
 * Shows loading state, error state, and empty state.
 */

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { default as Grid, default as Item } from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import React from "react";
import { useCalendar } from "../hooks/useCalendar.ts";
import { RoomCard } from "./RoomCard.tsx";

/**
 * Dutch text constants
 */
const DUTCH_TEXT = {
  loading: "Laden...",
  errorPrefix: "Fout: ",
  retry: "Opnieuw proberen",
  title: "Ruimtes",
  subtitle: "Afspraken voor deze week",
  noRooms: "Geen ruimtes gevonden.",
} as const;

/**
 * Room list component
 * Displays all rooms with their bookings for the current week
 * Uses Room class instances from useCalendar
 */
export function RoomList(): React.JSX.Element {
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
        <Typography>{DUTCH_TEXT.loading}</Typography>
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
        <Typography color="error">
          {DUTCH_TEXT.errorPrefix}
          {error.message}
        </Typography>
        <Button variant="contained" onClick={refresh}>
          {DUTCH_TEXT.retry}
        </Button>
      </Box>
    );
  }

  if (rooms.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography>{DUTCH_TEXT.noRooms}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" gutterBottom>
          {DUTCH_TEXT.title}
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          {DUTCH_TEXT.subtitle}
        </Typography>
      </Box>
      <Grid container spacing={2}>
        {rooms.map((room) => (
          <Grid key={room.canonicalName}>
            <Item>
              <RoomCard key={room.canonicalName} room={room} />
            </Item>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
