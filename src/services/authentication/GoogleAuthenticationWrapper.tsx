/**
 * Google Authentication Wrapper
 *
 * Composition root for Google authentication: wraps the app in Google's OAuth
 * provider, constructs the login-flow bridge, the local session storage, and
 * the GoogleAuthenticationAdapter, and passes them into AuthenticationProvider.
 * All Google wiring stays inside this module.
 */

import { useMemo } from "react";
import type { ReactNode } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { GoogleAuthenticationAdapter } from "./GoogleAuthenticationAdapter.ts";
import { LocalSessionStorageAdapter } from "./LocalSessionStorageAdapter.ts";
import { AuthenticationProvider } from "./AuthenticationProvider.tsx";
import { useGoogleLoginFlow } from "./useGoogleLoginFlow.ts";

/** Props for GoogleAuthenticationWrapper */
export interface GoogleAuthenticationWrapperProps {
  children: ReactNode;
  /** Google OAuth client ID */
  clientId: string;
}

/**
 * Wraps the app in Google OAuth and provides a GoogleAuthenticationAdapter
 * as the AuthenticationServicePort.
 *
 * @param props - Children and the Google OAuth client ID
 */
export function GoogleAuthenticationWrapper(
  { children, clientId }: GoogleAuthenticationWrapperProps,
): React.JSX.Element {
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleAuthenticationComposer>
        {children}
      </GoogleAuthenticationComposer>
    </GoogleOAuthProvider>
  );
}

/**
 * Constructs the Google adapter below GoogleOAuthProvider, where the
 * hook-based login flow bridge is available.
 */
function GoogleAuthenticationComposer(
  { children }: { children: ReactNode },
): React.JSX.Element {
  const sessionStorage = useMemo(() => new LocalSessionStorageAdapter(), []);
  const initiateLogin = useGoogleLoginFlow();
  const authenticationService = useMemo(
    () =>
      new GoogleAuthenticationAdapter({
        initiateLogin,
        sessionStorage,
      }),
    [initiateLogin, sessionStorage],
  );

  return (
    <AuthenticationProvider
      sessionStorage={sessionStorage}
      authenticationService={authenticationService}
    >
      {children}
    </AuthenticationProvider>
  );
}
