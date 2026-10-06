import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import { useUser } from "../context/useUser.ts";

/**
 * Settings page component
 * Displays user profile information from Google
 * Fields are not editable per requirements
 */
export function Settings(): React.JSX.Element {
  const { profile, logout } = useUser();

  return (
    <Box sx={{ py: 4 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 4 }}>
        <Typography variant="h2" component="h1">
          Ingelogd als {profile!.name}
        </Typography>
        <Button variant="contained" onClick={logout}>
          Uitloggen
        </Button>
      </Box>

      <Box
        sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 600 }}
      >
        <Avatar
          alt={profile!.name}
          src={profile!.picture}
          sx={{ width: 64, height: 64 }}
          slotProps={{
            img: {
              crossOrigin: "anonymous",
            },
          }}
        >
          {profile!.name.charAt(0).toUpperCase()}
        </Avatar>

        <Box
          component="dl"
          sx={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 1 }}
        >
          <Typography component="dt" sx={{ fontWeight: "bold" }}>
            name
          </Typography>
          <Typography component="dd">
            {profile!.name}
          </Typography>

          <Typography component="dt" sx={{ fontWeight: "bold" }}>
            email
          </Typography>
          <Typography component="dd">
            {profile!.email}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
