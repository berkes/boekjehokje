import HelpIcon from "@mui/icons-material/Help";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import React from "react";
import { BrowserRouter as Router, Link, Route, Routes } from "react-router-dom";
import "./App.scss";
import logoUrl from "./assets/logo.svg";
import {
  CalendarView,
  GoogleAuthenticationWrapper,
} from "./components/index.ts";
import { ProfileMenu } from "./components/ProfileMenu.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import { UserProvider } from "./context/UserContext.tsx";
import { useUser } from "./context/useUser.ts";
import { DemoCalendar, Faq, Landing, Settings } from "./pages/index.ts";
import { GoogleCalendarAdapter } from "./services/GoogleCalendarAdapter.ts";
import {
  CALENDAR_ID,
  GoogleCalendarApiClient,
} from "./utils/calendar/GoogleCalendarApiClient.ts";
import { ThemeProvider } from "@mui/material/styles";
import { appTheme } from "./theme.ts";

/**
 * Main application component
 * Wrapped with UserProvider and GoogleAuthenticationWrapper
 */
function App(): React.JSX.Element {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline enableColorScheme />
      <Router basename={import.meta.env.BASE_URL}>
        <GoogleAuthenticationWrapper clientId={clientId}>
          <UserProvider>
            <AppBar position="static" color="primary" enableColorOnDark>
              <Toolbar>
                <img
                  src={logoUrl}
                  alt="Logo"
                  style={{ width: "40px", height: "40px", marginRight: "12px" }}
                />
                <Typography
                  variant="h6"
                  component={Link}
                  to="/"
                  sx={{ flexGrow: 1, textDecoration: "none", color: "inherit" }}
                >
                  Boek je Hokje
                </Typography>
                <Button
                  component={Link}
                  to="/faq"
                  color="inherit"
                  startIcon={<HelpIcon />}
                  sx={{ mr: 1 }}
                >
                  Help
                </Button>
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
                <Route path="/faq" element={<Faq />} />
                <Route path="/demo" element={<DemoCalendar />} />
              </Routes>
            </Container>
          </UserProvider>
        </GoogleAuthenticationWrapper>
      </Router>
    </ThemeProvider>
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
        {isLoggedIn ? <MainContent /> : <Landing />}
      </Box>
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
