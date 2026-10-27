import React, { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type {
  AuthenticatedUser,
  AuthenticationTokens,
} from "../services/authentication/index.ts";
import { useAuthenticationService } from "../services/authentication/index.ts";
import { UserContext } from "./useUser.ts";

// Type definitions
export interface AuthenticationState {
  user: AuthenticatedUser | null;
  tokens: AuthenticationTokens | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UserContextType extends AuthenticationState {
  login: () => Promise<void>;
  logout: () => void;
}

// Provider component
interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider(
  { children }: UserProviderProps,
): React.JSX.Element {
  const service = useAuthenticationService();
  const [state, setState] = useState<AuthenticationState>({
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

  const value: UserContextType = {
    ...state,
    login,
    logout,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
