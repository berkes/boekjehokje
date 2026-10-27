/**
 * Session Storage Port
 *
 * Contract for persisting the authentication session. Implementations store
 * what the authentication service hands them; validity and expiry are
 * decided by the service, not by storage.
 */

import type { AuthenticationSession } from "./AuthenticationServicePort.ts";

/**
 * Error raised when a session storage operation fails.
 *
 * Adapters wrap the underlying storage errors in this type, so consumers can
 * distinguish storage failures from "no session stored" (null).
 */
export class SessionStorageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SessionStorageError";
  }
}

/**
 * Interface for session persistence.
 * Implementations can be real (LocalSessionStorageAdapter) or in-memory
 * (for tests and the E2E fake-auth seam).
 */
export interface SessionStoragePort {
  /**
   * Persist the given session.
   *
   * @throws SessionStorageError when the storage fails
   */
  save(session: AuthenticationSession): void;
  /**
   * Load the stored session, or null if no valid session is stored.
   *
   * @throws SessionStorageError when the storage fails
   */
  load(): AuthenticationSession | null;
  /**
   * Remove the stored session.
   *
   * @throws SessionStorageError when the storage fails
   */
  clear(): void;
}
