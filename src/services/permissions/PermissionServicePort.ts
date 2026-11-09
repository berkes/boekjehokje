/**
 * Permission service port (input port of the permission service)
 *
 * The port through which services ask whether the current user may perform
 * an action: the calendar service calls may("update", booking) to mark
 * editable bookings (ADR-0004), and may("create") to decide whether a
 * booking may be created at all.
 */

/**
 * The actions the app asks permission for
 */
export type PermissionAction = "create" | "update" | "delete";

/**
 * The subject of an update/delete permission: anything carrying the
 * booking author's email (a domain Booking satisfies this)
 */
export interface BookingSubject {
  details: { author: string };
}

/**
 * The port every permission service must implement
 */
export interface PermissionServicePort {
  /** Whether the current user may create a booking (any authenticated user may) */
  may(action: "create"): boolean;
  /** Whether the current user may update or delete the given booking */
  may(action: "update" | "delete", booking: BookingSubject): boolean;
}
