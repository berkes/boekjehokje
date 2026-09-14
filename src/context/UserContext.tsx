import React, { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  clearAuthTokens,
  clearUserProfile,
  getAuthTokens,
  getUserProfile,
  isAuthenticated,
  saveAuthTokens,
  saveUserProfile,
} from "../utils/storage";
import type { AuthTokens } from "../utils/storage";
import { UserContext } from "./useUser";

// Type definitions
export interface UserProfile {
  name: string;
  email: string;
  picture?: string;
}

export interface AuthState {
  tokens: AuthTokens | null;
  profile: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface UserContextType extends AuthState {
  login: (tokens: AuthTokens, profile: UserProfile) => void;
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
  const [state, setState] = useState<AuthState>({
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
        const tokens = getAuthTokens();
        const profile = getUserProfile();

        setState({
          tokens,
          profile,
          isLoggedIn: isAuthenticated(),
          isLoading: false,
          error: null,
        });
      } catch (error) {
        console.error("Failed to initialize auth state:", error);
        setState({
          tokens: null,
          profile: null,
          isLoggedIn: false,
          isLoading: false,
          error: "Failed to initialize auth state",
        });
      }
    };

    initialize();
  }, []);

  // Login function - saves tokens and profile to localStorage
  const login = (tokens: AuthTokens, profile: UserProfile): void => {
    try {
      saveAuthTokens(tokens);
      saveUserProfile(profile);

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

  // Logout function - clears all auth data
  const logout = (): void => {
    try {
      clearAuthTokens();
      clearUserProfile();

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
      saveUserProfile(profile);
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
