import type { CredentialResponse } from "@react-oauth/google";
import { useCallback } from "react";
import { useUser } from "../context/useUser.ts";
import type { AuthTokens as StorageAuthTokens } from "../utils/storage.ts";
import type { GoogleProfile } from "./GoogleAuth.tsx";

// Hardcoded development user for when Google Auth is not configured
const DEV_USER = {
  name: "Dev User",
  email: "dev@boekjehokje.local",
  picture: undefined,
} as const;

// Hardcoded development tokens
const DEV_TOKENS: StorageAuthTokens = {
  accessToken: "dev-access-token",
  tokenType: "Bearer",
  expiresAt: Date.now() + 86400000, // 24 hours
};

/**
 * Helper to decode JWT without external libraries
 * Note: This is a simple base64url decode, no verification
 */
function decodeJwt<T>(token: string): T {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join(""),
  );
  return JSON.parse(jsonPayload) as T;
}

/**
 * Custom hook for handling Google authentication
 * Prefixed with 'use' per AGENT.md
 */
export function useGoogleAuth() {
  const { login, logout, isLoggedIn, profile, isLoading, error } = useUser();

  const loginGoogleUser = useCallback(
    (credentialResponse: CredentialResponse) => {
      if (!credentialResponse.credential) {
        console.error("No credential in Google auth response");
        return;
      }

      try {
        const profile = decodeJwt<GoogleProfile>(credentialResponse.credential);

        // Create tokens object - credential is the ID token (JWT)
        // For Google OAuth with implicit flow, we use the ID token as access token
        const tokens: StorageAuthTokens = {
          accessToken: credentialResponse.credential,
          tokenType: "Bearer",
          // Extract expiration from JWT (exp is in seconds, convert to milliseconds)
          expiresAt: profile.exp * 1000,
        };

        // Extract user profile
        const userProfile = {
          name: profile.name,
          email: profile.email,
          picture: profile.picture,
        };

        login(tokens, userProfile);
      } catch (err) {
        console.error("Failed to process Google auth response:", err);
        // Still login with basic info to handle errors gracefully
        const userProfile = {
          name: "Unknown",
          email: "unknown@example.com",
        };
        const tokens: StorageAuthTokens = {
          accessToken: credentialResponse.credential || "",
          tokenType: "Bearer",
          expiresAt: Date.now() + 3600000, // 1 hour fallback
        };
        login(tokens, userProfile);
      }
    },
    [login],
  );

  const handleError = useCallback(() => {
    console.error("Google authentication failed");
  }, []);

  const loginDevUser = useCallback(() => {
    login(DEV_TOKENS, DEV_USER);
  }, [login]);

  return {
    isLoggedIn,
    profile,
    isLoading,
    error,
    loginGoogleUser,
    handleError,
    login,
    logout,
    loginDevUser,
  };
}
