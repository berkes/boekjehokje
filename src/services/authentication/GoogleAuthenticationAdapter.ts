/**
 * Google Authentication Adapter
 *
 * Anti-corruption layer around Google OAuth (`@react-oauth/google`) and the
 * Google People API. This is the only place in the codebase that knows about
 * Google's response shapes, scopes, token expiry math, or the People API.
 *
 * The Google library is hook-based; the `initiateLogin` dependency is a small
 * bridge created from `useGoogleLogin` (see useGoogleLoginFlow.ts), so this
 * adapter itself stays a plain, unit-testable class.
 */

import type {
  AuthenticatedUser,
  AuthenticationServicePort,
  AuthenticationSession,
  AuthenticationTokens,
} from "./AuthenticationServicePort.ts";
import { PEOPLE_API_BASE } from "../../config/googleApi.ts";
import type { SessionStoragePort } from "./SessionStoragePort.ts";

/** Assumed token lifetime for responses without an expiry (one hour) */
const DEFAULT_TOKEN_LIFETIME_MS = 3_600_000;

/** Fallback user when the profile cannot be fetched */
const UNKNOWN_USER: AuthenticatedUser = {
  name: "Onbekend",
  email: "unknown@example.com",
};

/** Google People API response shape, only used inside this module */
interface GooglePeopleProfile {
  names?: { displayName?: string }[];
  emailAddresses?: { value?: string }[];
  photos?: { url?: string }[];
}

/**
 * Google OAuth response shapes this adapter normalizes.
 *
 * Token responses (implicit flow) carry an access token and expiry in
 * seconds; legacy credential responses carry an ID token instead.
 */
export type GoogleOAuthResponse =
  | { access_token: string; expires_in?: number }
  | { credential: string };

/** Initiates the Google login flow and resolves with Google's response */
type GoogleLoginInitiator = () => Promise<GoogleOAuthResponse>;

/** Constructor options for GoogleAuthenticationAdapter */
interface GoogleAuthenticationAdapterOptions {
  /** Bridge to the Google login flow (see useGoogleLoginFlow.ts) */
  initiateLogin: GoogleLoginInitiator;
  /** Session persistence */
  sessionStorage: SessionStoragePort;
  /** Clock, injectable for testing */
  now?: () => number;
}

/**
 * Google Authentication Adapter
 *
 * Implements the AuthenticationServicePort with Google OAuth and the Google
 * People API. Normalizes Google's response shapes into our domain tokens,
 * fetches the profile, and persists the session through SessionStoragePort.
 */
export class GoogleAuthenticationAdapter implements AuthenticationServicePort {
  /** Person fields requested from the Google People API */
  private static readonly PEOPLE_API_FIELDS = "names,emailAddresses,photos";

  private initiateLogin: GoogleLoginInitiator;
  private sessionStorage: SessionStoragePort;
  private now: () => number;

  /**
   * Create a new Google authentication adapter
   *
   * @param options - Dependencies: login flow bridge, session storage, and
   * optional clock
   */
  constructor(options: GoogleAuthenticationAdapterOptions) {
    this.initiateLogin = options.initiateLogin;
    this.sessionStorage = options.sessionStorage;
    this.now = options.now ?? Date.now;
  }

  /**
   * Run the Google login flow, fetch the profile, and persist the session.
   *
   * @returns The authenticated user
   * @throws Error when the login flow fails
   */
  async login(): Promise<AuthenticatedUser> {
    const response = await this.initiateLogin();
    const tokens = this.normalizeTokens(response);
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
   * Fetch the profile of the user the given access token belongs to, from
   * the Google People API.
   *
   * Part of the AuthenticationServicePort: the return value is our own
   * profile type; the People API response shape stays inside this adapter.
   *
   * @param accessToken - OAuth 2.0 access token
   * @returns The profile in domain terms
   * @throws Error if the request fails or the profile is incomplete
   */
  async fetchProfile(accessToken: string): Promise<AuthenticatedUser> {
    const url =
      `${PEOPLE_API_BASE}/people/me?personFields=${GoogleAuthenticationAdapter.PEOPLE_API_FIELDS}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as {
        error?: { message?: string };
      };
      throw new Error(
        `Google People API request failed: ${response.status} ${response.statusText}` +
          (errorData.error?.message ? ` - ${errorData.error.message}` : ""),
      );
    }

    const data: GooglePeopleProfile = await response.json();
    const name = data.names?.[0]?.displayName || "Onbekend";
    const email = data.emailAddresses?.[0]?.value || "";
    const picture = data.photos?.[0]?.url;

    if (!email) {
      throw new Error("No email found in Google People API response");
    }

    const profile: AuthenticatedUser = { name, email };
    if (picture) {
      profile.picture = picture;
    }
    return profile;
  }

  /**
   * Normalize a Google OAuth response into our domain tokens.
   */
  private normalizeTokens(response: GoogleOAuthResponse): AuthenticationTokens {
    const now = this.now();

    if ("access_token" in response) {
      const lifetimeMs = response.expires_in
        ? response.expires_in * 1000
        : DEFAULT_TOKEN_LIFETIME_MS;
      return {
        accessToken: response.access_token,
        expiresAt: now + lifetimeMs,
        tokenType: "Bearer",
      };
    }

    return {
      accessToken: response.credential,
      expiresAt: now + DEFAULT_TOKEN_LIFETIME_MS,
      tokenType: "Bearer",
    };
  }

  /**
   * Fetch the profile, falling back to a minimal user when the profile
   * cannot be retrieved.
   */
  private async fetchUserProfile(
    accessToken: string,
  ): Promise<AuthenticatedUser> {
    try {
      return await this.fetchProfile(accessToken);
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
