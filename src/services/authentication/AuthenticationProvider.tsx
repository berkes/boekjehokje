/**
 * Authentication Provider
 *
 * Provides the AuthenticationServicePort and the SessionStoragePort through
 * React context. Both are passed in as properties: app wiring composes the
 * Google adapter and local session storage (see GoogleAuthenticationWrapper),
 * while tests and E2E harnesses can inject fakes.
 */

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { AuthenticationServicePort } from "./AuthenticationServicePort.ts";
import type { SessionStoragePort } from "./SessionStoragePort.ts";

const AuthenticationServiceContext = createContext<
  AuthenticationServicePort | undefined
>(undefined);

const SessionStorageContext = createContext<SessionStoragePort | undefined>(
  undefined,
);

/** Props for AuthenticationProvider */
interface AuthenticationProviderProps {
  /** The session storage backing the authentication service */
  sessionStorage: SessionStoragePort;
  /** The authentication service, e.g. a GoogleAuthenticationAdapter */
  authenticationService: AuthenticationServicePort;
  children: ReactNode;
}

/**
 * Provides the authentication service and session storage to the tree below.
 *
 * @param props - Session storage, authentication service, and children
 */
export function AuthenticationProvider(
  {
    sessionStorage,
    authenticationService,
    children,
  }: AuthenticationProviderProps,
): React.JSX.Element {
  return (
    <AuthenticationServiceContext.Provider value={authenticationService}>
      <SessionStorageContext.Provider value={sessionStorage}>
        {children}
      </SessionStorageContext.Provider>
    </AuthenticationServiceContext.Provider>
  );
}

/**
 * Access the authentication service.
 *
 * @returns The AuthenticationServicePort provided by AuthenticationProvider
 */
export function useAuthenticationService(): AuthenticationServicePort {
  const service = useContext(AuthenticationServiceContext);
  if (service === undefined) {
    throw new Error(
      "useAuthenticationService must be used within an AuthenticationProvider",
    );
  }
  return service;
}

/**
 * Access the session storage backing the authentication service.
 *
 * @returns The SessionStoragePort provided by AuthenticationProvider
 */
export function useSessionStorage(): SessionStoragePort {
  const sessionStorage = useContext(SessionStorageContext);
  if (sessionStorage === undefined) {
    throw new Error(
      "useSessionStorage must be used within an AuthenticationProvider",
    );
  }
  return sessionStorage;
}
