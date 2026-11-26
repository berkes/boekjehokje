/**
 * Pending actions port (input port of the pending actions service)
 *
 * The undo feature (issue #36): booking writes (create, update, delete)
 * are not performed immediately but queued, so the user can undo them.
 * The service performs each queued action after a configurable delay
 * (30 seconds by default) and reports every state change to its
 * subscribers; "undo" cancels all pending actions.
 */

import type {
  Booking,
  BookingUpdate,
  NewBooking,
} from "../calendar/CalendarServicePort.ts";

/**
 * The default delay before a queued action is performed: 30 seconds
 * (issue #36). Configurable through the service's dependencies.
 */
export const DEFAULT_PENDING_ACTION_DELAY_MS = 30_000;

/**
 * The kind of write a pending action performs
 */
export type PendingActionKind = "create" | "update" | "delete";

/**
 * A queued booking action, in domain language. The label is the room's
 * short name (e.g. "04 KH"), for user-facing messages.
 */
export interface PendingAction {
  id: string;
  kind: PendingActionKind;
  label: string;
}

/**
 * A state change of a pending action: queued when it enters the queue,
 * performed when the write succeeded after the delay, failed when the
 * write threw, cancelled when undo removed it from the queue.
 */
export type PendingActionEvent =
  | { type: "queued"; action: PendingAction }
  | { type: "performed"; action: PendingAction }
  | { type: "failed"; action: PendingAction; error: unknown }
  | { type: "cancelled"; action: PendingAction };

/**
 * A subscriber of pending action events
 */
export type PendingActionListener = (event: PendingActionEvent) => void;

/**
 * The port every pending actions service must implement
 */
export interface PendingActionsPort {
  /**
   * Queue a create: the booking is written to the calendar source only
   * after the delay, unless cancelled before
   */
  queueCreate(booking: NewBooking): PendingAction;
  /**
   * Queue an update: the booking is updated on the calendar source only
   * after the delay, unless cancelled before
   */
  queueUpdate(booking: BookingUpdate): PendingAction;
  /**
   * Queue a delete of the given booking: the event is removed from the
   * calendar source only after the delay, unless cancelled before
   */
  queueDelete(booking: Booking): PendingAction;
  /**
   * Undo: cancel every pending action. Cancelled actions are never
   * performed.
   */
  cancelAll(): void;
  /**
   * The actions currently in the queue, awaiting their delay
   */
  pending(): PendingAction[];
  /**
   * Subscribe to pending action events; returns the unsubscribe function
   */
  subscribe(listener: PendingActionListener): () => void;
}
