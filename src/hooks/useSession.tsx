/**
 * Session state hook
 *
 * The React bridge to the authentication service: it calls the service
 * (from the service tree, via useAuthenticationService) and manages the
 * result — the current session — as normal React state. Components use
 * this hook; they never touch the service's storage themselves.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type {
  AuthenticatedUser,
  AuthenticationTokens,
} from "../services/index.ts";
import { useAuthenticationService } from "./useServices.ts";

/**
 * The authentication session as React state
 */
export interface SessionState {
  user: AuthenticatedUser | null;
  tokens: AuthenticationTokens | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * The session context value: the session state plus the actions
 */
export interface SessionContextType extends SessionState {
  login: () => Promise<void>;
  logout: () => void;
  /**
   * End the session because it expired and could not be re-established
   * silently (issue #23): the user is signed out and sees a message on
   * the anonymous homepage
   */
  expireSession: () => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

/** Props for SessionProvider */
interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Provides the session state, derived from the authentication service, to
 * the tree below
 */
export function SessionProvider(
  { children }: SessionProviderProps,
): React.JSX.Element {
  const service = useAuthenticationService();
  const [state, setState] = useState<SessionState>({
    user: null,
    tokens: null,
    isLoggedIn: false,
    isLoading: true,
    error: null,
  });

  // Restore the session from the authentication service on mount
  useEffect(() => {
    const user = service.getAuthenticatedUser();

    setState({
      user,
      tokens: service.getTokens(),
      isLoggedIn: user !== null,
      isLoading: false,
      error: null,
    });
  }, [service]);

  // Login function - runs the login flow through the authentication service
  const login = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const user = await service.login();

      setState({
        user,
        tokens: service.getTokens(),
        isLoggedIn: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Authentication failed:", error);

      // Clear user data on authentication failure
      service.logout();

      setState({
        user: null,
        tokens: null,
        isLoggedIn: false,
        isLoading: false,
        error: "Inloggen mislukt",
      });
    }
  }, [service]);

  // Logout function - clears all authentication data
  const logout = useCallback((): void => {
    service.logout();

    setState({
      user: null,
      tokens: null,
      isLoggedIn: false,
      isLoading: false,
      error: null,
    });
  }, [service]);

  // Expire the session: it ended (e.g. the access token expired and could
  // not be refreshed silently) - sign out and tell the user why, so the
  // anonymous homepage shows the message next to the login button
  const expireSession = useCallback((): void => {
    service.logout();

    setState({
      user: null,
      tokens: null,
      isLoggedIn: false,
      isLoading: false,
      error: "Je sessie is verlopen. Log opnieuw in.",
    });
  }, [service]);

  const value: SessionContextType = {
    ...state,
    login,
    logout,
    expireSession,
  };

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

/**
 * Access the session state (and the login/logout actions)
 */
export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
