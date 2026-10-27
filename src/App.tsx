import React from "react";
import "./App.scss";
import CssBaseline from "@mui/material/CssBaseline";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import {
  CalendarView,
  GoogleAuthButton,
  GoogleAuthWrapper,
} from "./components/index.ts";
import { UserProvider } from "./context/UserContext.tsx";
import { useUser } from "./context/useUser.ts";
import { ProfileMenu } from "./components/ProfileMenu.tsx";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import { BrowserRouter as Router, Link, Route, Routes } from "react-router-dom";
import { DemoCalendar, Settings } from "./pages/index.ts";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { GoogleCalendarAdapter } from "./services/GoogleCalendarAdapter.ts";
import {
  CALENDAR_ID,
  GoogleCalendarApiClient,
} from "./utils/calendar/GoogleCalendarApiClient.ts";

/**
 * Main application component
 * Wrapped with UserProvider and GoogleAuthWrapper
 */
function App(): React.JSX.Element {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  return (
    <React.Fragment>
      <CssBaseline enableColorScheme />
      <Router basename={import.meta.env.BASE_URL}>
        <GoogleAuthWrapper clientId={clientId}>
          <UserProvider>
            <AppBar position="static" color="primary" enableColorOnDark>
              <Toolbar>
                <Typography
                  variant="h6"
                  component={Link}
                  to="/"
                  sx={{ flexGrow: 1, textDecoration: "none", color: "inherit" }}
                >
                  Boek je Hokje
                </Typography>
                <ProfileMenu />
              </Toolbar>
            </AppBar>
            <Container maxWidth="lg">
              <Routes>
                <Route path="/" element={<AppContent />} />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route path="/demo" element={<DemoCalendar />} />
              </Routes>
            </Container>
          </UserProvider>
        </GoogleAuthWrapper>
      </Router>
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
        <Typography>Laden...</Typography>
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
      </Box>

      <Box component="main">
        {isLoggedIn ? <MainContent /> : <LandingPage />}
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
      <Typography variant="subtitle1">
        Ruimte boeken voor de NYMA Makersplaats
      </Typography>
      <Typography variant="body1" sx={{ mt: 2, mb: 4 }}>
        Log in om ruimtes te boeken
      </Typography>
      <GoogleAuthButton />
    </Box>
  );
}

/**
 * Main content shown when user is authenticated
 */
function MainContent(): React.JSX.Element {
  const { tokens, user } = useUser();
  if (!tokens || !user) {
    throw new Error("MainContent needs tokens and user");
  }

  const service = new GoogleCalendarAdapter(
    new GoogleCalendarApiClient(tokens.accessToken),
    CALENDAR_ID,
    user,
  );
  return (
    <Box>
      <Box component="section" sx={{ mb: 4 }}>
        <CalendarView service={service} />
      </Box>
    </Box>
  );
}

export default App;
