/**
 * Authentication Service Port
 *
 * Domain language API for authentication. This is the contract consumers code
 * against: users, sessions, and tokens in our terms. No Google types, token
 * expiry math, or People API details leak through this interface.
 *
 * See issue #12 and docs/adr/0001-playwright-e2e-and-agent-browser-testing.md
 * for the rationale: with this port, tests and E2E harnesses inject fakes
 * instead of mimicking Google's response shapes.
 */

/**
 * A user authenticated with the application, described in domain terms.
 */
export interface AuthenticatedUser {
  /** Display name */
  name: string;
  /** Email address identifying the user */
  email: string;
  /** URL of the profile picture, if available */
  picture?: string;
}

/**
 * Authentication tokens in our terms.
 *
 * Provider response shapes are normalized into this type by the
 * authentication adapter. Expiry is an absolute epoch timestamp so consumers
 * never do expiry math.
 */
export interface AuthenticationTokens {
  accessToken: string;
  /** Expiry as epoch milliseconds */
  expiresAt: number;
  /** Token type, e.g. "Bearer" */
  tokenType: string;
  /** Optional refresh token; the current implicit flow has none */
  refreshToken?: string;
}

/**
 * An authentication session: the authenticated user plus their tokens.
 */
export interface AuthenticationSession {
  user: AuthenticatedUser;
  tokens: AuthenticationTokens;
}

/**
 * Interface for authentication operations.
 *
 * Implementations can be real (GoogleAuthenticationAdapter) or fake
 * (TestAuthenticationAdapter in unit tests, the fake-auth seam in E2E tests).
 */
export interface AuthenticationServicePort {
  /**
   * Run the login flow and return the authenticated user.
   *
   * @returns The authenticated user
   * @throws Error when the login flow fails
   */
  login(): Promise<AuthenticatedUser>;
  /** End the session and discard the stored credentials. */
  logout(): void;
  /**
   * Restore the session and return the authenticated user, or null when
   * there is no session or it has expired.
   */
  getAuthenticatedUser(): AuthenticatedUser | null;
  /** Whether a valid, non-expired session exists. */
  isAuthenticated(): boolean;
  /**
   * The tokens of the current session, or null when there is no valid
   * session. Used by API clients (e.g. the calendar service) that need an
   * access token.
   */
  getTokens(): AuthenticationTokens | null;
  /**
   * Fetch the profile of the user the given access token belongs to.
   *
   * The return value is our own profile type; how the provider is asked for
   * it is up to the adapter.
   *
   * @param accessToken - The access token to fetch the profile for
   * @returns The profile in domain terms
   * @throws Error if the profile cannot be fetched or is incomplete
   */
  fetchProfile(accessToken: string): Promise<AuthenticatedUser>;
}
