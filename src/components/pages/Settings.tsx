import React, { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { usePreferences } from "../../hooks/index.ts";
import { useSession } from "../../hooks/useSession.tsx";

/**
 * Settings page component
 *
 * Shows the read-only Google profile of the signed-in user and, below it,
 * the editable booking details (issue #18): the booker name and contact
 * the app puts on bookings. Those are user preferences, stored in
 * localStorage through the preferences service - never business data. They
 * are pre-filled from the Google profile until changed here, and take
 * effect for the next booking without re-login.
 */
export function Settings(): React.JSX.Element {
  const { user, logout } = useSession();
  const preferences = usePreferences();

  const [bookerName, setBookerName] = useState(() =>
    preferences.getBookerName() || user!.name
  );
  const [contact, setContact] = useState(() =>
    preferences.getBookerContact() || user!.email
  );
  const [saved, setSaved] = useState(false);

  const handleSave = (event: React.FormEvent): void => {
    event.preventDefault();
    preferences.saveBookerName(bookerName.trim());
    preferences.saveBookerContact(contact.trim());
    setSaved(true);
  };

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <Typography variant="h2" component="h1">
          Ingelogd als {user!.name}
        </Typography>
        <Button variant="contained" onClick={logout}>
          Uitloggen
        </Button>
      </Box>

      <Box
        sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 600 }}
      >
        <Avatar
          alt={user!.name}
          src={user!.picture}
          sx={{ width: 64, height: 64 }}
          slotProps={{
            img: {
              crossOrigin: "anonymous",
            },
          }}
        >
          {user!.name.charAt(0).toUpperCase()}
        </Avatar>

        <Typography variant="h3" component="h2">
          Google-profiel
        </Typography>
        <Box
          component="dl"
          sx={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 1 }}
        >
          <Typography component="dt" sx={{ fontWeight: "bold" }}>
            Naam
          </Typography>
          <Typography component="dd">
            {user!.name}
          </Typography>

          <Typography component="dt" sx={{ fontWeight: "bold" }}>
            E-mail
          </Typography>
          <Typography component="dd">
            {user!.email}
          </Typography>
        </Box>

        <Typography variant="h3" component="h2">
          Boekingsgegevens
        </Typography>
        <Typography>
          Deze gegevens worden aan je boeking in Google Agenda toegevoegd. Zo
          weten anderen wie de ruimte heeft geboekt en hoe ze je kunnen
          bereiken.
        </Typography>
        <Stack
          component="form"
          spacing={2}
          onSubmit={handleSave}
          sx={{ maxWidth: 600 }}
        >
          <TextField
            label="Boeker"
            value={bookerName}
            onChange={(event) => {
              setBookerName(event.target.value);
              setSaved(false);
            }}
            fullWidth
          />
          <TextField
            label="Contact"
            value={contact}
            onChange={(event) => {
              setContact(event.target.value);
              setSaved(false);
            }}
            helperText="E-mailadres of telefoonnummer"
            fullWidth
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Button type="submit" variant="contained">
              Opslaan
            </Button>
            {saved && (
              <Alert severity="success">Boekingsgegevens opgeslagen</Alert>
            )}
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
