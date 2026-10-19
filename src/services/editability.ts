/**
 * Editability: whether a booking may be changed by the current user
 *
 * A booking is editable when it was created by the currently authenticated
 * user. See docs/adr/0004-editability-ownership.md for the decision.
 */
import type { Booking } from "./rooms.ts";

/** Minimal shape needed to decide editability of a booking */
interface BookingWithAuthor {
  details: { author: string };
}

/** Minimal profile shape of the authenticated user */
export interface UserProfileLike {
  email: string;
}

/**
 * Whether the given user profile may edit the given booking.
 *
 * Both emails are compared case-insensitively, since email addresses are
 * case-insensitive for the domain part and Google treats them as
 * case-insensitive identifiers.
 */
export function isEditableBy(
  booking: BookingWithAuthor,
  profile: UserProfileLike | null | undefined,
): boolean {
  if (!profile?.email) return false;
  return (
    booking.details.author.trim().toLowerCase() ===
      profile.email.trim().toLowerCase()
  );
}

/** Convenience overload for a full Booking */
export function isEditable(
  booking: Booking,
  profile: UserProfileLike | null | undefined,
): boolean {
  return isEditableBy(booking, profile);
}
