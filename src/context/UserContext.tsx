import React, { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  clearAuthenticationState,
  getAuthenticationState,
  isAuthenticated,
  saveAuthenticationState,
} from "../utils/storage.ts";
import type { AuthenticationTokens } from "../utils/storage.ts";
import { UserContext } from "./useUser.ts";

// Type definitions
export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
}

export interface AuthenticationState {
  tokens: AuthenticationTokens | null;
  profile: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UserContextType extends AuthenticationState {
  login: (tokens: AuthenticationTokens, profile: UserProfile) => void;
  logout: () => void;
  updateProfile: (profile: UserProfile) => void;
}

// Provider component
interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider(
  { children }: UserProviderProps,
): React.JSX.Element {
  const [state, setState] = useState<AuthenticationState>({
    tokens: null,
    profile: null,
    isLoggedIn: false,
    isLoading: true,
    error: null,
  });

  // Initialize from localStorage on mount
  useEffect(() => {
    const initialize = () => {
      try {
        const authState = getAuthenticationState();
        const isAuth = isAuthenticated();
        // Only use profile if authenticated
        const profile = isAuth ? authState.profile : null;

        setState({
          tokens: authState.tokens,
          profile,
          isLoggedIn: isAuth,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Failed to initialize authentication state:", error);
        setState({
          tokens: null,
          profile: null,
          isLoggedIn: false,
          isLoading: false,
          error: "Failed to initialize authentication state",
        });
      }
    };

    initialize();
  }, []);

  // Login function - saves tokens and profile to localStorage
  const login = (tokens: AuthenticationTokens, profile: UserProfile): void => {
    try {
      saveAuthenticationState({ tokens, profile });

      setState({
        tokens,
        profile,
        isLoggedIn: true,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to save authentication data:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to save authentication data",
      }));
    }
  };

  // Logout function - clears all authentication data
  const logout = (): void => {
    try {
      clearAuthenticationState();

      setState({
        tokens: null,
        profile: null,
        isLoggedIn: false,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error("Failed to clear authentication data:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Failed to clear authentication data",
      }));
    }
  };

  // Update profile function
  const updateProfile = (profile: UserProfile): void => {
    try {
      const state = getAuthenticationState();
      saveAuthenticationState({ ...state, profile });
      setState((prev) => ({
        ...prev,
        profile,
        error: null,
      }));
    } catch (error) {
      console.error("Failed to update profile:", error);
      setState((prev) => ({
        ...prev,
        error: "Failed to update profile",
      }));
    }
  };

  const value: UserContextType = {
    ...state,
    login,
    logout,
    updateProfile,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
