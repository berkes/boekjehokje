import React from "react";

import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useGoogleAuth } from "./useGoogleAuth.ts";

// Re-export CredentialResponse for use in index.ts
export type { CredentialResponse } from "@react-oauth/google";

// Type for decoded JWT payload
export interface GoogleProfile {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
  iat: number;
  exp: number;
}

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

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

  if (isLoading) {
    return <div className="auth-loading">Laden...</div>;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleLogin
        onSuccess={loginGoogleUser}
        onError={handleError}
        useOneTap
        text="signin_with"
        shape="rectangular"
        theme="outline"
        size="large"
      />
    </GoogleOAuthProvider>
  );
}

/**
 * Wrapper component that provides Google OAuth context
 * This should wrap the entire application or at least the auth-dependent parts
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
