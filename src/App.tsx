import React from "react";
import "./App.scss";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { GoogleAuthButton, GoogleAuthWrapper } from "./components/index.ts";
import { UserProvider } from "./context/UserContext.tsx";
import { useUser } from "./context/useUser.ts";
import { ProfileMenu } from "./components/ProfileMenu.tsx";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";

// Dutch text constants per project plan (Keep UI in Dutch)
const DUTCH_TEXT = {
  title: "boekjehokje",
  subtitle: "Ruimte boeken voor de NYMA Makersplaats",
  loading: "Laden...",
  welcome: "Welkom",
  loginPrompt: "Meld je aan om ruimtes te boeken",
  bookedBy: "Geboekt door",
} as const;

/**
 * Main application component
 * Wrapped with UserProvider and GoogleAuthWrapper
 */
function App(): React.JSX.Element {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  return (
    <React.Fragment>
      <CssBaseline enableColorScheme />
      <UserProvider>
        <GoogleAuthWrapper clientId={clientId}>
          <AppBar position="static" color="primary" enableColorOnDark>
            <Toolbar>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                {DUTCH_TEXT.title}
              </Typography>
              <ProfileMenu />
            </Toolbar>
          </AppBar>
          <Container maxWidth="lg">
            <AppContent />
          </Container>
        </GoogleAuthWrapper>
      </UserProvider>
    </React.Fragment>
  );
}

/**
 * Application content component
 * Uses the useUser hook to access auth state
 */
function AppContent(): React.JSX.Element {
  const { isLoggedIn, isLoading } = useUser();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>{DUTCH_TEXT.loading}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box
        component="header"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          py: 2,
        }}
      >
        <Stack>
          <Typography variant="subtitle1">
            {DUTCH_TEXT.subtitle}
          </Typography>
        </Stack>
      </Box>

      <Box component="main">
        {isLoggedIn
          ? <MainContent />
          : <LandingPage />}
      </Box>
    </Box>
  );
}

/**
 * Landing page shown when user is not authenticated
 */
function LandingPage(): React.JSX.Element {
  return (
    <Box sx={{ textAlign: "center", py: 8 }}>
      <Typography variant="body1" sx={{ mt: 2, mb: 4 }}>
        {DUTCH_TEXT.loginPrompt}
      </Typography>
      <GoogleAuthButton />
    </Box>
  );
}

/**
 * Main content shown when user is authenticated
 */
function MainContent(
): React.JSX.Element {
  return (
    <Box>
      <Box component="section" sx={{ mb: 4 }}>
        <Typography variant="h3">
          Beschikbare ruimtes
        </Typography>
        <Typography color="text.secondary">
          Selecteer een ruimte om te boeken.
        </Typography>
        {/* Room list will be added in future tasks */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mt: 2 }}
        >
          <RoomCard name="Makersruimte 1" capacity={10} />
          <RoomCard name="Makersruimte 2" capacity={8} />
          <RoomCard name="Vergaderruimte" capacity={6} />
        </Stack>
      </Box>
    </Box>
  );
}

/**
 * Room card component - placeholder for future development
 */
function RoomCard(
  { name, capacity }: { name: string; capacity: number },
): React.JSX.Element {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="div">
          {name}
        </Typography>
        <Typography color="text.secondary">
          Capaciteit: {capacity} personen
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small">Bekijken</Button>
      </CardActions>
    </Card>
  );
}

export default App;
