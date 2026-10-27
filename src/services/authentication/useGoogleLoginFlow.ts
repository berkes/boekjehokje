/**
 * Google Login Flow bridge
 *
 * `@react-oauth/google`'s `useGoogleLogin` is a React hook; this bridge turns
 * it into a plain promise-returning function so that
 * GoogleAuthenticationAdapter stays a non-React, unit-testable class. The
 * Google-specific configuration (flow type, scopes) lives here and in the
 * adapter, never in the UI.
 *
 * Must be used below GoogleOAuthProvider.
 */

import { useCallback, useRef } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import type { GoogleOAuthResponse } from "./GoogleAuthenticationAdapter.ts";

/** Google OAuth scopes for the People API and Calendar API */
const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

/** A login attempt that has been started but not yet settled */
interface PendingLogin {
  resolve: (response: GoogleOAuthResponse) => void;
  reject: (reason: Error) => void;
}

/**
 * Returns a function that initiates the Google login flow and resolves with
 * Google's OAuth response, or rejects when the flow fails.
 */
export function useGoogleLoginFlow(): () => Promise<GoogleOAuthResponse> {
  const pending = useRef<PendingLogin | null>(null);

  const login = useGoogleLogin({
    flow: "implicit",
    scope: GOOGLE_OAUTH_SCOPES,
    onSuccess: (tokenResponse) => {
      pending.current?.resolve(tokenResponse);
      pending.current = null;
    },
    onError: () => {
      pending.current?.reject(new Error("Google authentication failed"));
      pending.current = null;
    },
  });

  return useCallback(
    () =>
      new Promise<GoogleOAuthResponse>((resolve, reject) => {
        pending.current = { resolve, reject };
        login();
      }),
    [login],
  );
}
