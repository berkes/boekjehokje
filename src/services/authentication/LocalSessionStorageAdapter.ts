/**
 * Local Session Storage Adapter
 *
 * Persists the authentication session in localStorage. Storage stays dumb: it
 * merely stores what the authentication service hands it; it does not decide
 * validity or expiry.
 *
 * Storage failures are wrapped in SessionStorageError and raised; they are
 * never swallowed. Stored content that is not a valid session yields null.
 *
 * AUTHENTICATION_STORAGE_KEY is the documented seam for establishing a fake
 * authenticated session in E2E tests: write a session of this shape with a
 * future `expiresAt` and the app restores it without Google. See AGENTS.md.
 */

import type {
  AuthenticatedUser,
  AuthenticationSession,
  AuthenticationTokens,
} from "./AuthenticationServicePort.ts";
import {
  SessionStorageError,
  type SessionStoragePort,
} from "./SessionStoragePort.ts";

/** Storage key for the authentication session */
export const AUTHENTICATION_STORAGE_KEY = "boekjehokje_authentication";

/**
 * Minimal storage surface, so tests can inject an in-memory implementation.
 */
export interface BrowserStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Persists the authentication session in localStorage.
 */
export class LocalSessionStorageAdapter implements SessionStoragePort {
  private storage: BrowserStorage;
  private key: string;

  /**
   * Create a new local session storage adapter
   *
   * @param storage - Storage implementation (defaults to localStorage)
   * @param key - Storage key (defaults to AUTHENTICATION_STORAGE_KEY)
   */
  constructor(
    storage: BrowserStorage = globalThis.localStorage,
    key: string = AUTHENTICATION_STORAGE_KEY,
  ) {
    this.storage = storage;
    this.key = key;
  }

  /** Persist the given session */
  save(session: AuthenticationSession): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(session));
    } catch (error) {
      throw new SessionStorageError(
        "Could not persist authentication session",
        { cause: error },
      );
    }
  }

  /** Load the stored session, or null if no valid session is stored */
  load(): AuthenticationSession | null {
    let serialized: string | null;

    try {
      serialized = this.storage.getItem(this.key);
    } catch (error) {
      throw new SessionStorageError(
        "Could not load the stored authentication session",
        { cause: error },
      );
    }

    if (serialized === null) {
      return null;
    }

    return parseSession(serialized);
  }

  /** Remove the stored session */
  clear(): void {
    try {
      this.storage.removeItem(this.key);
    } catch (error) {
      throw new SessionStorageError(
        "Could not clear the stored authentication session",
        { cause: error },
      );
    }
  }
}

/**
 * Parse a serialized session; content that is not a valid session yields
 * null, malformed JSON included.
 */
function parseSession(serialized: string): AuthenticationSession | null {
  let data: unknown;
  try {
    data = JSON.parse(serialized);
  } catch {
    return null;
  }

  if (typeof data !== "object" || data === null) {
    return null;
  }

  const candidate = data as Record<string, unknown>;
  if (!isUser(candidate.user) || !isTokens(candidate.tokens)) {
    return null;
  }

  return { user: candidate.user, tokens: candidate.tokens };
}

function isUser(value: unknown): value is AuthenticatedUser {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    (candidate.picture === undefined ||
      typeof candidate.picture === "string");
}

function isTokens(value: unknown): value is AuthenticationTokens {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.accessToken === "string" &&
    typeof candidate.expiresAt === "number" &&
    typeof candidate.tokenType === "string" &&
    (candidate.refreshToken === undefined ||
      typeof candidate.refreshToken === "string");
}
