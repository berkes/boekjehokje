import React from "react";
import "./App.scss";
import CssBaseline from '@mui/material/CssBaseline';
import { GoogleAuthButton, GoogleAuthWrapper } from "./components/index.ts";
import { UserProvider } from "./context/UserContext.tsx";
import { useUser } from "./context/useUser.ts";
import Container from "@mui/material/Container";

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
      <CssBaseline enableColorScheme/>
      <UserProvider>
        <GoogleAuthWrapper clientId={clientId}>
          <Container>
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
  const { isLoggedIn, profile, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="loading-container">
        <p>{DUTCH_TEXT.loading}</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">
            {DUTCH_TEXT.title}
          </h1>
          <p className="app-subtitle">
            {DUTCH_TEXT.subtitle}
          </p>
        </div>
      </header>

      <main>
        {isLoggedIn && profile
          ? <MainContent profile={profile} />
          : <LandingPage />}
      </main>
    </div>
  );
}

/**
 * Landing page shown when user is not authenticated
 */
function LandingPage(): React.JSX.Element {
  return (
    <div className="landing-page">
      <h2 className="landing-title">
        {DUTCH_TEXT.welcome}
      </h2>
      <p className="landing-text">
        {DUTCH_TEXT.loginPrompt}
      </p>
      <GoogleAuthButton />
    </div>
  );
}

/**
 * Main content shown when user is authenticated
 */
function MainContent(
  { profile }: { profile: { name: string; email: string; picture?: string } },
): React.JSX.Element {
  return (
    <div>
      <div className="welcome-card">
        <h2 className="welcome-title">
          Welkom, {profile.name}!
        </h2>
        <p className="welcome-text">
          Je bent ingelogd als {profile.email}
        </p>
      </div>

      <section className="rooms-section">
        <h3>Beschikbare ruimtes</h3>
        <p>Selecteer een ruimte om te boeken.</p>
        {/* Room list will be added in future tasks */}
        <div className="rooms-grid">
          <RoomCard name="Makersruimte 1" capacity={10} />
          <RoomCard name="Makersruimte 2" capacity={8} />
          <RoomCard name="Vergaderruimte" capacity={6} />
        </div>
      </section>
    </div>
  );
}

/**
 * Room card component - placeholder for future development
 */
function RoomCard(
  { name, capacity }: { name: string; capacity: number },
): React.JSX.Element {
  return (
    <div className="room-card">
      <h4 className="room-name">
        {name}
      </h4>
      <p className="room-capacity">
        Capaciteit: {capacity} personen
      </p>
      <button type="button" className="room-button">
        Bekijken
      </button>
    </div>
  );
}

export default App;
