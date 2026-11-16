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

import { useCallback, useMemo, useRef } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import type { OverridableTokenClientConfig } from "@react-oauth/google";
import type { GoogleOAuthResponse } from "../services/authentication/GoogleAuthenticationAdapter.ts";

/**
 * Google OAuth scopes for the People API and Calendar API. The Calendar
 * scope is `calendar.events` (read/write on events, issue #14), not
 * `calendar.readonly`: existing users must log in again to grant it.
 */
const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

/** A login attempt that has been started but not yet settled */
interface PendingLogin {
  resolve: (response: GoogleOAuthResponse) => void;
  reject: (reason: Error) => void;
}

/**
 * The two bridges into the Google login flow: the full login (popup when
 * needed) and the silent access-token re-request (no prompt while the
 * user's Google session is active — the token model's only refresh path,
 * since the implicit flow issues no refresh tokens, issue #23)
 */
export interface GoogleLoginFlow {
  /** Initiate the full login flow; resolves with Google's OAuth response */
  initiateLogin: () => Promise<GoogleOAuthResponse>;
  /** Silently re-request an access token; resolves with Google's response */
  requestAccessToken: () => Promise<GoogleOAuthResponse>;
}

/**
 * Returns the bridges into the Google login flow that resolve with Google's
 * OAuth response, or reject when the flow fails.
 */
export function useGoogleLoginFlow(): GoogleLoginFlow {
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

  const run = useCallback(
    (overrideConfig?: OverridableTokenClientConfig) =>
      new Promise<GoogleOAuthResponse>((resolve, reject) => {
        pending.current = { resolve, reject };
        login(overrideConfig);
      }),
    [login],
  );

  return useMemo(
    () => ({
      initiateLogin: () => run(),
      // An empty prompt asks the token client for a token without any UI;
      // it only succeeds while the user's Google session is still active
      requestAccessToken: () => run({ prompt: "" }),
    }),
    [run],
  );
}
