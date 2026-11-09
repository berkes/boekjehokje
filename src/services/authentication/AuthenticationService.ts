/**
 * Authentication service
 *
 * The app's domain object for authentication: it implements the
 * AuthenticationServicePort (input port) and holds no React state. The
 * session is persisted through the SessionStoragePort repository; the
 * external identity provider is behind the AuthenticationProviderPort
 * (GoogleAuthenticationAdapter in production). Both are passed in on
 * creation, so tests inject fakes and E2E harnesses use the documented
 * localStorage seam.
 */

import type {
  AuthenticatedUser,
  AuthenticationServicePort,
  AuthenticationSession,
  AuthenticationTokens,
} from "./AuthenticationServicePort.ts";
import type { AuthenticationProviderPort } from "./AuthenticationProviderPort.ts";
import type { SessionStoragePort } from "./SessionStoragePort.ts";

/** Fallback user when the profile cannot be fetched */
const UNKNOWN_USER: AuthenticatedUser = {
  name: "Onbekend",
  email: "unknown@example.com",
};

/**
 * The dependencies of the authentication service, passed in on creation
 */
export interface AuthenticationServiceDeps {
  /** The identity provider (output port) running the login flow and fetching profiles */
  provider: AuthenticationProviderPort;
  /** The session storage repository persisting the session */
  sessionStorage: SessionStoragePort;
  /** Clock in epoch milliseconds, injectable for testing */
  now?: () => number;
}

/**
 * Authentication service
 *
 * Runs the login flow through the provider, persists the session through
 * the session storage repository, and restores/validates sessions on
 * reads. Expired sessions are discarded.
 */
export class AuthenticationService implements AuthenticationServicePort {
  private provider: AuthenticationProviderPort;
  private sessionStorage: SessionStoragePort;
  private now: () => number;

  /**
   * Create a new authentication service
   *
   * @param deps - The injected dependencies: provider, session storage,
   *               and an optional clock
   */
  constructor(deps: AuthenticationServiceDeps) {
    this.provider = deps.provider;
    this.sessionStorage = deps.sessionStorage;
    this.now = deps.now ?? Date.now;
  }

  /**
   * Run the login flow, fetch the profile, and persist the session.
   *
   * @returns The authenticated user
   * @throws Error when the login flow fails
   */
  async login(): Promise<AuthenticatedUser> {
    const tokens = await this.provider.login();
    const user = await this.fetchUserProfile(tokens.accessToken);

    this.sessionStorage.save({ user, tokens });
    return user;
  }

  /** End the session and discard the stored credentials */
  logout(): void {
    this.sessionStorage.clear();
  }

  /**
   * Restore the session and return the authenticated user, or null when
   * there is no session or it has expired.
   */
  getAuthenticatedUser(): AuthenticatedUser | null {
    return this.loadValidSession()?.user ?? null;
  }

  /** Whether a valid, non-expired session exists */
  isAuthenticated(): boolean {
    return this.loadValidSession() !== null;
  }

  /** The tokens of the current session, or null when there is none */
  getTokens(): AuthenticationTokens | null {
    return this.loadValidSession()?.tokens ?? null;
  }

  /**
   * Fetch the profile of the user the given access token belongs to,
   * through the provider.
   *
   * @param accessToken - The access token to fetch the profile for
   * @returns The profile in domain terms
   * @throws Error if the profile cannot be fetched or is incomplete
   */
  fetchProfile(accessToken: string): Promise<AuthenticatedUser> {
    return this.provider.fetchProfile(accessToken);
  }

  /**
   * Fetch the profile, falling back to a minimal user when the profile
   * cannot be retrieved.
   */
  private async fetchUserProfile(
    accessToken: string,
  ): Promise<AuthenticatedUser> {
    try {
      return await this.provider.fetchProfile(accessToken);
    } catch (error) {
      console.error("Failed to fetch profile, falling back:", error);
      return { ...UNKNOWN_USER };
    }
  }

  /**
   * Load the stored session; expired sessions are discarded.
   */
  private loadValidSession(): AuthenticationSession | null {
    const session = this.sessionStorage.load();
    if (session === null) {
      return null;
    }

    if (session.tokens.expiresAt <= this.now()) {
      this.sessionStorage.clear();
      return null;
    }

    return session;
  }
}
