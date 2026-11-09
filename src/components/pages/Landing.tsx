import React from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Link from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { Link as RouterLink } from "react-router-dom";
import { GoogleAuthenticationButton } from "../index.ts";
import overviewDesktop from "../../assets/overview-desktop.png";
import overviewMobile from "../../assets/overview-mobile.png";

/**
 * Landing page for visitors who are not signed in: what boekjehokje is, the
 * three steps to book a room, screenshots of the overview and the Google
 * sign-in button as the primary call to action.
 */
export function Landing(): React.JSX.Element {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Box sx={{ maxWidth: 860, mx: "auto", py: { xs: 4, md: 8 } }}>
      <Typography variant="h3" component="h1" sx={{ mb: 2 }}>
        Boek je hokje in de NYMA Makersplaats
      </Typography>
      <Typography
        variant="subtitle1"
        sx={{ color: "text.secondary", maxWidth: 640 }}
      >
        BoekJeHokje zet de gedeelde Google Agenda van de NYMA Makersplaats om in
        één helder overzicht van alle ruimtes. Je ziet direct welk hokje wanneer
        vrij is en boekt het in een paar klikken.
      </Typography>

      <Box component="section" sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 1 }}>
          Zo boek je een ruimte
        </Typography>
        <List sx={{ listStyleType: "decimal", pl: 4, m: 0 }}>
          <ListItem sx={{ display: "list-item", px: 0, py: 0.5 }}>
            <ListItemText
              primary={
                <>
                  Log in met je Google-account met toegang tot de NYMA-agenda.
                  {" "}
                  <Link component={RouterLink} to="/faq">
                    Waarom?
                  </Link>
                </>
              }
            />
          </ListItem>
          <ListItem sx={{ display: "list-item", px: 0, py: 0.5 }}>
            <ListItemText primary="Bekijk in één helder overzicht wanneer welke ruimte vrij is." />
          </ListItem>
          <ListItem sx={{ display: "list-item", px: 0, py: 0.5 }}>
            <ListItemText primary="Boek je ruimte moeiteloos: zonder conflicten en met alle informatie in het juiste formaat." />
          </ListItem>
        </List>
        <Alert severity="warning" sx={{ mt: 3 }}>
          <AlertTitle>boekjehokje is in testmodus</AlertTitle>
          Inloggen met Google werkt alleen voor accounts die daarvoor zijn
          vrijgegeven. Stuur het e-mailadres van je Google-account via Signal
          naar{" "}
          <Link href="https://signal.me/#eu/9ExllGhqYUgGR5fsZy0lnjIhXRgS-Of1A4oA4mTYJz7HI0Th6OZOfYfLlQ1L6iI9">
            @berkes.69
          </Link>{" "}
          — dan whitelist ik je.
        </Alert>
        <Stack
          direction="row"
          spacing={3}
          sx={{ mt: 3, alignItems: "center", flexWrap: "wrap" }}
        >
          <GoogleAuthenticationButton />
          <Typography variant="body1">
            Nog vragen?{" "}
            <Link component={RouterLink} to="/faq">
              Veelgestelde vragen
            </Link>
          </Typography>
        </Stack>
      </Box>

      <Box component="section" sx={{ mt: 8 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          Zo ziet het eruit
        </Typography>
        <Stack
          direction={isNarrow ? "column" : "row"}
          spacing={2}
          sx={{ alignItems: isNarrow ? "stretch" : "flex-start" }}
        >
          <Box
            component="img"
            src={overviewDesktop}
            alt="Het ruimte-overzicht op desktop: alle ruimtes in kolommen met boekingen en vrije timeslots"
            sx={{
              display: "block",
              height: "auto",
              maxWidth: "100%",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
              ...(isNarrow
                ? { width: "100%" }
                : { flex: "1 1 0%", minWidth: 0 }),
            }}
          />
          <Box
            component="img"
            src={overviewMobile}
            alt="Het ruimte-overzicht op mobiel: dezelfde kolommen, horizontaal te swipen"
            sx={{
              display: "block",
              height: "auto",
              maxWidth: "100%",
              borderRadius: 1,
              border: "1px solid",
              borderColor: "divider",
              ...(isNarrow ? { width: "100%" } : { width: 240, flexShrink: 0 }),
            }}
          />
        </Stack>
      </Box>
    </Box>
  );
}
