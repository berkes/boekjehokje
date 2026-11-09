import HelpIcon from "@mui/icons-material/Help";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { ThemeProvider } from "@mui/material/styles";
import { GoogleOAuthProvider } from "@react-oauth/google";
import React, { useMemo } from "react";
import type { ReactNode } from "react";
import { BrowserRouter as Router, Link, Route, Routes } from "react-router-dom";
import "./App.scss";
import logoUrl from "./assets/logo.svg";
import { CalendarView } from "./components/calendar/index.ts";
import { ProfileMenu } from "./components/ProfileMenu.tsx";
import { ProtectedRoute } from "./components/ProtectedRoute.tsx";
import {
  DemoCalendar,
  Faq,
  Landing,
  Settings,
} from "./components/pages/index.ts";
import { ServicesProvider } from "./hooks/ServicesProvider.tsx";
import { SessionProvider, useSession } from "./hooks/useSession.tsx";
import { appTheme } from "./theme.ts";
import {
  AuthenticationService,
  CALENDAR_ID,
  CalendarService,
  ClockService,
  GoogleAuthenticationAdapter,
  GoogleCalendarRepositoryAdapter,
  LocalSessionStorageAdapter,
  LocalStorageAdapter,
  PermissionService,
  PreferencesService,
  type Services,
} from "./services/index.ts";
import { useGoogleLoginFlow } from "./services/authentication/index.ts";

/**
 * Main application component
 *
 * The composition root: below Google's OAuth provider, AppServices builds
 * the entire tree of services and their repositories once, and provides it
 * through ServicesProvider; every underlying component reaches the
 * services only through the hooks.
 */
function App(): React.JSX.Element {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline enableColorScheme />
      <GoogleOAuthProvider clientId={clientId}>
        <AppServices>
          <Router basename={import.meta.env.BASE_URL}>
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
          </Router>
        </AppServices>
      </GoogleOAuthProvider>
    </ThemeProvider>
  );
}

/**
 * Composition root for the service tree: builds every service and its
 * repositories once, with all dependencies injected at creation, and
 * provides the tree through ServicesProvider (with the session state on
 * top, via SessionProvider).
 */
function AppServices({ children }: { children: ReactNode }): React.JSX.Element {
  const initiateLogin = useGoogleLoginFlow();

  const services = useMemo<Services>(() => {
    const clock = new ClockService();
    const sessionStorage = new LocalSessionStorageAdapter();
    const authentication = new AuthenticationService({
      provider: new GoogleAuthenticationAdapter({ initiateLogin }),
      sessionStorage,
    });
    const permissions = new PermissionService({ authentication });
    const events = new GoogleCalendarRepositoryAdapter({
      calendarId: CALENDAR_ID,
      authentication,
    });
    const calendar = new CalendarService({ events, permissions, clock });
    const preferences = new PreferencesService({
      store: new LocalStorageAdapter(),
    });
    return { authentication, calendar, permissions, clock, preferences };
  }, [initiateLogin]);

  return (
    <ServicesProvider services={services}>
      <SessionProvider>{children}</SessionProvider>
    </ServicesProvider>
  );
}

/**
 * Application content component
 * Uses the useSession hook to access the session state
 */
function AppContent(): React.JSX.Element {
  const { isLoggedIn, isLoading } = useSession();

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
 * Main content shown when the user is authenticated: the calendar board,
 * served by the calendar service from the service tree
 */
function MainContent(): React.JSX.Element {
  return (
    <Box>
      <Box component="section" sx={{ mb: 4 }}>
        <CalendarView />
      </Box>
    </Box>
  );
}

export default App;
