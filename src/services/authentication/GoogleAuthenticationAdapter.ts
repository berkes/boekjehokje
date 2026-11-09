/**
 * Google Authentication adapter
 *
 * Anti-corruption layer around Google OAuth (`@react-oauth/google`) and the
 * Google People API. This is the only place in the codebase that knows about
 * Google's response shapes, scopes, token expiry math, or the People API.
 * It implements the AuthenticationProviderPort (output port); the session
 * handling lives in the AuthenticationService.
 *
 * The Google library is hook-based; the `initiateLogin` dependency is a small
 * bridge created from `useGoogleLogin` (see useGoogleLoginFlow.ts), so this
 * adapter itself stays a plain, unit-testable class.
 */

import type {
  AuthenticatedUser,
  AuthenticationTokens,
} from "./AuthenticationServicePort.ts";
import type { AuthenticationProviderPort } from "./AuthenticationProviderPort.ts";

/** Google People API base URL, overridable for the E2E mock (ADR-0001) */
const PEOPLE_API_BASE: string = import.meta.env?.VITE_GOOGLE_PEOPLE_API_BASE ||
  "https://people.googleapis.com/v1";

/** Assumed token lifetime for responses without an expiry (one hour) */
const DEFAULT_TOKEN_LIFETIME_MS = 3_600_000;

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
export type GoogleLoginInitiator = () => Promise<GoogleOAuthResponse>;

/**
 * The dependencies of the Google authentication adapter, passed in on
 * creation
 */
export interface GoogleAuthenticationAdapterDeps {
  /** Bridge to the Google login flow (see useGoogleLoginFlow.ts) */
  initiateLogin: GoogleLoginInitiator;
  /** Clock in epoch milliseconds, injectable for testing */
  now?: () => number;
  /** People API base URL override (defaults to the Google People API base) */
  peopleApiBase?: string;
}

/**
 * Google Authentication Adapter
 *
 * Implements the AuthenticationProviderPort with Google OAuth and the
 * Google People API. Normalizes Google's response shapes into our domain
 * tokens and fetches the profile from the People API.
 */
export class GoogleAuthenticationAdapter implements AuthenticationProviderPort {
  /** Person fields requested from the Google People API */
  private static readonly PEOPLE_API_FIELDS = "names,emailAddresses,photos";

  private initiateLogin: GoogleLoginInitiator;
  private now: () => number;
  private peopleApiBase: string;

  /**
   * Create a new Google authentication adapter
   *
   * @param deps - The injected dependencies: login flow bridge, optional
   *               clock and People API base URL override
   */
  constructor(deps: GoogleAuthenticationAdapterDeps) {
    this.initiateLogin = deps.initiateLogin;
    this.now = deps.now ?? Date.now;
    this.peopleApiBase = deps.peopleApiBase ?? PEOPLE_API_BASE;
  }

  /**
   * Run the Google login flow and normalize the response into domain
   * tokens.
   *
   * @returns The session tokens in domain terms
   * @throws Error when the login flow fails
   */
  async login(): Promise<AuthenticationTokens> {
    const response = await this.initiateLogin();
    return this.normalizeTokens(response);
  }

  /**
   * Fetch the profile of the user the given access token belongs to, from
   * the Google People API.
   *
   * @param accessToken - OAuth 2.0 access token
   * @returns The profile in domain terms
   * @throws Error if the request fails or the profile is incomplete
   */
  async fetchProfile(accessToken: string): Promise<AuthenticatedUser> {
    const url =
      `${this.peopleApiBase}/people/me?personFields=${GoogleAuthenticationAdapter.PEOPLE_API_FIELDS}`;

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
}
