import type { CredentialResponse, TokenResponse } from "@react-oauth/google";
import { useCallback } from "react";
import { useUser } from "../context/useUser.ts";
import type { AuthenticationTokens as StorageAuthenticationTokens } from "../utils/storage.ts";
import { fetchGooglePeopleProfile } from "../utils/googlePeopleApi.ts";

/**
 * Custom hook for handling Google authentication
 * Uses Google People API instead of manual JWT decoding
 * Prefixed with 'use' per AGENT.md
 */
export function useGoogleAuth() {
  const { login, logout, isLoggedIn, profile, isLoading, error } = useUser();

  const loginGoogleUser = useCallback(
    async (authResponse: CredentialResponse | TokenResponse) => {
      // Determine if this is a TokenResponse (has access_token) or CredentialResponse (has credential)
      let accessToken: string;
      let expiresAt: number;

      if ("access_token" in authResponse) {
        // This is a TokenResponse from useGoogleLogin
        accessToken = authResponse.access_token;
        // expires_in is in seconds, convert to milliseconds and add to current time
        expiresAt = Date.now() + (authResponse.expires_in * 1000);
      } else if (authResponse.credential) {
        // This is a CredentialResponse from GoogleLogin (legacy support)
        accessToken = authResponse.credential;
        // For ID tokens, we need to decode to get expiration
        // Fallback: assume 1 hour expiration
        expiresAt = Date.now() + 3600000;
      } else {
        console.error(
          "Invalid authentication response: no access token or credential",
        );
        return;
      }

      try {
        // Fetch user profile from Google People API
        const userProfile = await fetchGooglePeopleProfile(accessToken);

        // Create tokens object
        const tokens: StorageAuthenticationTokens = {
          accessToken: accessToken,
          tokenType: "Bearer",
          expiresAt: expiresAt,
        };

        // Save to context
        login(tokens, userProfile);
      } catch (err) {
        console.error("Failed to fetch Google People profile:", err);
        // Fallback to minimal profile
        const userProfile = {
          name: "Unknown",
          email: "unknown@example.com",
        };
        const tokens: StorageAuthenticationTokens = {
          accessToken: accessToken,
          tokenType: "Bearer",
          expiresAt: expiresAt,
        };
        login(tokens, userProfile);
      }
    },
    [login],
  );

  const handleError = useCallback(() => {
    console.error("Google authentication failed");
    // Clear user data on authentication error
    logout();
  }, [logout]);

  return {
    isLoggedIn,
    profile,
    isLoading,
    error,
    loginGoogleUser,
    handleError,
    login,
    logout,
  };
}
