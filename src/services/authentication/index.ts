/**
 * Authentication service - public API
 *
 * Exports the domain-language input port, the service, the domain types,
 * the output port and its Google adapter, and the session storage
 * repository. The React glue (session state hook, login-flow bridge,
 * service tree provider) lives in src/hooks, not here: services never touch
 * React state. The Google OAuth provider wiring is done by the composition
 * root in App.tsx.
 */

export type {
  AuthenticatedUser,
  AuthenticationServicePort,
  AuthenticationSession,
  AuthenticationTokens,
} from "./AuthenticationServicePort.ts";
export {
  AuthenticationService,
  type AuthenticationServiceDeps,
} from "./AuthenticationService.ts";
export type { AuthenticationProviderPort } from "./AuthenticationProviderPort.ts";
export {
  GoogleAuthenticationAdapter,
  type GoogleAuthenticationAdapterDeps,
  type GoogleLoginInitiator,
  type GoogleOAuthResponse,
} from "./GoogleAuthenticationAdapter.ts";
export {
  SessionStorageError,
  type SessionStoragePort,
} from "./SessionStoragePort.ts";
export {
  AUTHENTICATION_STORAGE_KEY,
  type BrowserStorage,
  LocalSessionStorageAdapter,
} from "./LocalSessionStorageAdapter.ts";
