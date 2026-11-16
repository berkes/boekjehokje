/**
 * Authentication provider port (output port of the authentication service)
 *
 * The port through which the authentication service talks to an external
 * identity provider (Google OAuth + People API). Implemented by
 * GoogleAuthenticationAdapter; all provider-specific details (response
 * shapes, scopes, token expiry math, the People API) stay behind this port
 * and inside the adapter.
 */

import type {
  AuthenticatedUser,
  AuthenticationTokens,
} from "./AuthenticationServicePort.ts";

/**
 * The port every identity provider adapter must implement
 */
export interface AuthenticationProviderPort {
  /**
   * Run the provider's login flow
   *
   * @returns The session tokens in domain terms (normalized by the adapter)
   * @throws Error when the login flow fails
   */
  login(): Promise<AuthenticationTokens>;
  /**
   * Re-request an access token without user interaction: the token model's
   * silent refresh path (GIS `requestAccessToken()` with an empty prompt),
   * which resolves while the user's provider session is still active and
   * fails otherwise. The implicit flow issues no refresh tokens, so this
   * is the only way to get a fresh access token in a pure-frontend app.
   *
   * @returns The fresh session tokens in domain terms (normalized by the adapter)
   * @throws Error when no token can be issued without interaction
   */
  refreshAccessToken(): Promise<AuthenticationTokens>;
  /**
   * Fetch the profile of the user the given access token belongs to
   *
   * @param accessToken - The access token to fetch the profile for
   * @returns The profile in domain terms
   * @throws Error if the profile cannot be fetched or is incomplete
   */
  fetchProfile(accessToken: string): Promise<AuthenticatedUser>;
}
