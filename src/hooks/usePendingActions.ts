/**
 * React hook for pending actions (the undo feature, issue #36)
 *
 * The React bridge to the pending actions service: it queues booking
 * writes through the service (from the service tree, via
 * usePendingActionsService) and manages the service's events as React
 * state — the latest event for the toast and the number of pending
 * actions (which also guards window closing while actions are queued).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Booking,
  BookingUpdate,
  NewBooking,
  PendingActionEvent,
} from "../services/index.ts";
import { usePendingActionsService } from "./useServices.ts";

/**
 * Options for the usePendingActions hook
 */
export interface UsePendingActionsOptions {
  /**
   * Called when a queued action settled — performed or failed — because
   * the board then needs a reload
   */
  onSettled?: (event: PendingActionEvent) => void;
}

/**
 * The toast to show: the latest pending action event, and whether it is
 * still open (result toasts auto-hide and can be dismissed)
 */
export interface ActionToast {
  event: PendingActionEvent;
  open: boolean;
}

/**
 * Return type for the usePendingActions hook
 */
export interface UsePendingActionsReturn {
  /** Queue a create; it is written after the delay, unless undone */
  queueCreate: (booking: NewBooking) => void;
  /** Queue an update; it is written after the delay, unless undone */
  queueUpdate: (booking: BookingUpdate) => void;
  /** Queue a delete; it is written after the delay, unless undone */
  queueDelete: (booking: Booking) => void;
  /** Undo: cancel every pending action */
  undo: () => void;
  /** The toast to show for the latest pending action event */
  toast: ActionToast | null;
  /** Dismiss the toast */
  dismissToast: () => void;
  /** How many actions are currently queued */
  pendingCount: number;
  /** The delay after which a queued action is performed (from the service) */
  delayMs: number;
}

/**
 * Custom hook for the pending actions service: subscribes to its events,
 * keeps the latest event and the pending count as React state, and
 * guards window closing while actions are still queued (issue #36: the
 * browser's beforeunload alert lets the user choose to stay).
 */
export function usePendingActions(
  options: UsePendingActionsOptions = {},
): UsePendingActionsReturn {
  const service = usePendingActionsService();
  const [event, setEvent] = useState<PendingActionEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const onSettledRef = useRef(options.onSettled);

  useEffect(() => {
    onSettledRef.current = options.onSettled;
  }, [options.onSettled]);

  useEffect(() => {
    setPendingCount(service.pending().length);
    const unsubscribe = service.subscribe((next) => {
      setEvent(next);
      setDismissed(false);
      setPendingCount(service.pending().length);
      if (next.type === "performed" || next.type === "failed") {
        onSettledRef.current?.(next);
      }
    });
    return unsubscribe;
  }, [service]);

  /**
   * While actions are queued, closing the window asks for confirmation:
   * the beforeunload handler prevents the default and the browser shows
   * its alert (issue #36)
   */
  useEffect(() => {
    if (pendingCount === 0) {
      return;
    }
    const handler = (event: Event): void => {
      event.preventDefault();
    };
    globalThis.addEventListener("beforeunload", handler);
    return () => globalThis.removeEventListener("beforeunload", handler);
  }, [pendingCount]);

  const queueCreate = useCallback(
    (booking: NewBooking): void => {
      service.queueCreate(booking);
    },
    [service],
  );

  const queueUpdate = useCallback(
    (booking: BookingUpdate): void => {
      service.queueUpdate(booking);
    },
    [service],
  );

  const queueDelete = useCallback(
    (booking: Booking): void => {
      service.queueDelete(booking);
    },
    [service],
  );

  const undo = useCallback((): void => {
    service.cancelAll();
  }, [service]);

  const dismissToast = useCallback((): void => {
    setDismissed(true);
  }, []);

  return {
    queueCreate,
    queueUpdate,
    queueDelete,
    undo,
    toast: event === null ? null : { event, open: !dismissed },
    dismissToast,
    pendingCount,
    delayMs: service.delayMs,
  };
}
