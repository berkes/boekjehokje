/**
 * Permission service
 *
 * Decides what the current user may do, in domain language (ADR-0004):
 * anyone authenticated may create a booking, and a booking may be updated
 * or deleted only by the user whose email created it (creator email vs.
 * profile email, compared case-insensitively and trimmed — email addresses
 * are case-insensitive identifiers).
 *
 * The service holds no React state and no session of its own: it asks the
 * authentication service (injected on creation) for the current user on
 * every call, so login and logout are reflected immediately.
 */

import type { AuthenticationServicePort } from "../authentication/AuthenticationServicePort.ts";
import type {
  BookingSubject,
  PermissionAction,
  PermissionServicePort,
} from "./PermissionServicePort.ts";

/**
 * Normalize an email address for comparison: trim and lowercase
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * The dependencies of the permission service, passed in on creation
 */
export interface PermissionServiceDeps {
  /** The authentication service, providing the current user */
  authentication: AuthenticationServicePort;
}

/**
 * Permission service
 *
 * Implements the PermissionServicePort with the ownership rule of
 * ADR-0004, reading the current user from the authentication service.
 */
export class PermissionService implements PermissionServicePort {
  private authentication: AuthenticationServicePort;

  /**
   * Create a new permission service
   *
   * @param deps - The injected dependency: the authentication service
   */
  constructor(deps: PermissionServiceDeps) {
    this.authentication = deps.authentication;
  }

  may(action: "create"): boolean;
  may(action: "update" | "delete", booking: BookingSubject): boolean;
  may(action: PermissionAction, booking?: BookingSubject): boolean {
    if (action === "create") {
      return this.authentication.isAuthenticated();
    }
    if (!booking) return false;
    const user = this.authentication.getAuthenticatedUser();
    if (!user?.email) return false;
    return normalizeEmail(booking.details.author) ===
      normalizeEmail(user.email);
  }
}
