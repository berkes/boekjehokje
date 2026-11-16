/**
 * Authentication fakes for tests
 *
 * Central fakes for the authentication service's input port and its output
 * port, plus fixture builders for users, tokens and sessions. Tests inject
 * these instead of building their own mocks.
 */
import type {
  AuthenticatedUser,
  AuthenticationServicePort,
  AuthenticationSession,
  AuthenticationTokens,
} from "../../src/services/authentication/AuthenticationServicePort.ts";
import type { AuthenticationProviderPort } from "../../src/services/authentication/AuthenticationProviderPort.ts";

/**
 * The default fake user of the test suite
 */
export const fakeUser: AuthenticatedUser = {
  name: "Bèr",
  email: "ber@boekjehokje.test",
};

/**
 * Fake tokens, valid far into the future unless an expiry is given
 */
export function fakeTokens(expiresAt?: number): AuthenticationTokens {
  return {
    accessToken: "fake-access-token",
    expiresAt: expiresAt ?? Date.now() + 3_600_000,
    tokenType: "Bearer",
  };
}

/**
 * A fake session for the given user (default: fakeUser)
 */
export function fakeSession(
  user: AuthenticatedUser = fakeUser,
): AuthenticationSession {
  return { user, tokens: fakeTokens() };
}

/**
 * Fake authentication service: an AuthenticationServicePort with a
 * settable session, so tests control the "current user" directly
 */
export class FakeAuthenticationService implements AuthenticationServicePort {
  private user: AuthenticatedUser | null;
  private tokens: AuthenticationTokens | null;
  /** Whether refreshSession succeeds (default: true) */
  refreshSucceeds = true;
  /** The tokens refreshSession issues (default: fresh fake tokens) */
  refreshedTokens: AuthenticationTokens | null = null;
  /** How often refreshSession was called */
  refreshCount = 0;

  constructor(session: AuthenticationSession | null = fakeSession()) {
    this.user = session?.user ?? null;
    this.tokens = session?.tokens ?? null;
  }

  /** Establish the given session (null signs out) */
  signIn(session: AuthenticationSession | null): void {
    this.user = session?.user ?? null;
    this.tokens = session?.tokens ?? null;
  }

  login(): Promise<AuthenticatedUser> {
    return Promise.resolve(this.user ?? fakeUser);
  }

  logout(): void {
    this.signIn(null);
  }

  refreshSession(): Promise<boolean> {
    this.refreshCount++;
    if (!this.refreshSucceeds) {
      this.signIn(null);
      return Promise.resolve(false);
    }
    this.tokens = this.refreshedTokens ?? fakeTokens();
    return Promise.resolve(true);
  }

  getAuthenticatedUser(): AuthenticatedUser | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return this.user !== null;
  }

  getTokens(): AuthenticationTokens | null {
    return this.tokens;
  }

  fetchProfile(): Promise<AuthenticatedUser> {
    return Promise.resolve(this.user ?? fakeUser);
  }
}

/**
 * Fake identity provider: an AuthenticationProviderPort whose login and
 * profile fetch resolve with configurable values
 */
export class FakeAuthenticationProvider implements AuthenticationProviderPort {
  tokens: AuthenticationTokens;
  user: AuthenticatedUser;
  profileError: Error | null = null;
  refreshError: Error | null = null;

  constructor(
    options: {
      tokens?: AuthenticationTokens;
      user?: AuthenticatedUser;
      profileError?: Error;
      refreshError?: Error;
    } = {},
  ) {
    this.tokens = options.tokens ?? fakeTokens();
    this.user = options.user ?? fakeUser;
    this.profileError = options.profileError ?? null;
    this.refreshError = options.refreshError ?? null;
  }

  login(): Promise<AuthenticationTokens> {
    return Promise.resolve(this.tokens);
  }

  refreshAccessToken(): Promise<AuthenticationTokens> {
    if (this.refreshError) {
      return Promise.reject(this.refreshError);
    }
    return Promise.resolve(this.tokens);
  }

  fetchProfile(): Promise<AuthenticatedUser> {
    if (this.profileError) {
      return Promise.reject(this.profileError);
    }
    return Promise.resolve(this.user);
  }
}
