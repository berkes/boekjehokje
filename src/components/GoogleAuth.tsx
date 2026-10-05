import React from "react";

import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { useGoogleAuth } from "./useGoogleAuth.ts";

// Re-export CredentialResponse and TokenResponse for use in index.ts
export type { CredentialResponse, TokenResponse } from "@react-oauth/google";

// Google OAuth scopes for People API
const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

/**
 * Main Google authentication button component
 * Uses Dutch text per project plan
 */
export function GoogleAuthButton(): React.JSX.Element {
  const {
    isLoading,
    loginGoogleUser,
    handleError,
  } = useGoogleAuth();

  // Use useGoogleLogin hook for implicit flow with proper scopes
  const login = useGoogleLogin({
    flow: "implicit",
    scope: GOOGLE_OAUTH_SCOPES,
    onSuccess: (tokenResponse) => {
      // Pass the TokenResponse directly to loginGoogleUser
      loginGoogleUser(tokenResponse);
    },
    onError: () => {
      handleError();
    },
  });

  if (isLoading) {
    return <div className="authentication-loading">Laden...</div>;
  }

  return (
    <button
      type="button"
      onClick={() => login()}
      className="google-authentication-button"
      style={{
        padding: "10px 20px",
        backgroundColor: "#fff",
        border: "1px solid #ccc",
        borderRadius: "4px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "16px",
      }}
    >
      <img
        src="https://www.google.com/favicon.ico"
        alt="Google"
        style={{ width: "20px", height: "20px" }}
      />
      Inloggen met Google
    </button>
  );
}

/**
 * Wrapper component that provides Google OAuth context
 * This should wrap the entire application or at least the authentication-dependent parts
 */
export interface GoogleAuthWrapperProps {
  children: React.ReactNode;
  clientId: string;
}

export function GoogleAuthWrapper(
  { children, clientId }: GoogleAuthWrapperProps,
): React.JSX.Element {
  return (
    <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>
  );
}
