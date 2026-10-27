/**
 * Authentication - public API
 *
 * Exports the domain-language port, the domain types, and the React glue.
 * Google OAuth details (scopes, response shapes, People API, provider
 * wiring) stay inside this module: the adapters are composed internally by
 * GoogleAuthenticationWrapper and are not exported.
 */

export type {
  AuthenticatedUser,
  AuthenticationServicePort,
  AuthenticationSession,
  AuthenticationTokens,
} from "./AuthenticationServicePort.ts";
export {
  SessionStorageError,
  type SessionStoragePort,
} from "./SessionStoragePort.ts";
export { AUTHENTICATION_STORAGE_KEY } from "./LocalSessionStorageAdapter.ts";
export {
  useAuthenticationService,
  useSessionStorage,
} from "./AuthenticationProvider.tsx";
export { GoogleAuthenticationWrapper } from "./GoogleAuthenticationWrapper.tsx";
export type {
  GoogleAuthenticationWrapperProps,
} from "./GoogleAuthenticationWrapper.tsx";
