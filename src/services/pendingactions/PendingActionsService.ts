/**
 * Pending actions service
 *
 * Implements the PendingActionsPort (issue #36): booking writes are
 * queued instead of performed immediately. Each queued action is
 * performed through the calendar service after a configurable delay
 * (30 seconds by default); until then it can be cancelled ("undo",
 * which cancels every pending action). The timer is injected through
 * the TimerPort output port, so tests control the delay with a fake.
 *
 * The service holds no React state: the queue is ephemeral, every state
 * change is emitted to the subscribers (the usePendingActions hook
 * manages them as React state).
 */

import type {
  Booking,
  BookingUpdate,
  CalendarServicePort,
  NewBooking,
} from "../calendar/CalendarServicePort.ts";
import type { RoomsPort } from "../rooms/RoomsPort.ts";
import {
  DEFAULT_PENDING_ACTION_DELAY_MS,
  type PendingAction,
  type PendingActionEvent,
  type PendingActionKind,
  type PendingActionListener,
  type PendingActionsPort,
} from "./PendingActionsPort.ts";
import type { TimerHandle, TimerPort } from "./TimerPort.ts";

/**
 * The dependencies of the pending actions service, passed in on creation
 */
export interface PendingActionsServiceDeps {
  /** The calendar service the queued writes are performed through */
  calendar: CalendarServicePort;
  /** The rooms service, resolving the label (room short name) per action */
  rooms: RoomsPort;
  /** The timer (output port) the delay is scheduled on */
  timer: TimerPort;
  /** The delay before a queued action is performed (default: 30 seconds) */
  delayMs?: number;
}

/**
 * A queued action with its scheduled timer handle and the write to run
 */
interface QueuedEntry {
  action: PendingAction;
  run: () => Promise<unknown>;
  handle: TimerHandle | null;
}

/**
 * Pending actions service
 */
export class PendingActionsService implements PendingActionsPort {
  private calendar: CalendarServicePort;
  private rooms: RoomsPort;
  private timer: TimerPort;
  readonly delayMs: number;
  private entries = new Map<string, QueuedEntry>();
  private listeners = new Set<PendingActionListener>();
  private nextId = 1;

  constructor(deps: PendingActionsServiceDeps) {
    this.calendar = deps.calendar;
    this.rooms = deps.rooms;
    this.timer = deps.timer;
    this.delayMs = deps.delayMs ?? DEFAULT_PENDING_ACTION_DELAY_MS;
  }

  queueCreate(booking: NewBooking): PendingAction {
    return this.enqueue(
      "create",
      booking.room,
      () => this.calendar.createBooking(booking),
    );
  }

  queueUpdate(booking: BookingUpdate): PendingAction {
    return this.enqueue(
      "update",
      booking.room,
      () => this.calendar.updateBooking(booking),
    );
  }

  queueDelete(booking: Booking): PendingAction {
    return this.enqueue(
      "delete",
      booking.room,
      () => this.calendar.deleteBooking(booking.id),
    );
  }

  cancelAll(): void {
    const entries = [...this.entries.values()];
    this.entries.clear();
    for (const entry of entries) {
      if (entry.handle !== null) {
        this.timer.cancel(entry.handle);
      }
      this.emit({ type: "cancelled", action: entry.action });
    }
  }

  pending(): PendingAction[] {
    return [...this.entries.values()].map((entry) => entry.action);
  }

  subscribe(listener: PendingActionListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Queue an action: emit "queued" immediately and schedule the write on
   * the timer; when the delay has passed, perform it and emit the result
   */
  private enqueue(
    kind: PendingActionKind,
    room: string,
    run: () => Promise<unknown>,
  ): PendingAction {
    const action: PendingAction = {
      id: `pending-${this.nextId++}`,
      kind,
      label: this.labelFor(room),
    };
    const entry: QueuedEntry = { action, run, handle: null };
    entry.handle = this.timer.after(this.delayMs, () => {
      void this.perform(entry);
    });
    this.entries.set(action.id, entry);
    this.emit({ type: "queued", action });
    return action;
  }

  /**
   * Perform a queued action: it leaves the queue (it can no longer be
   * cancelled), the write runs through the calendar service and the
   * outcome is emitted — "performed" on success, "failed" with the
   * error when the write threw
   */
  private async perform(entry: QueuedEntry): Promise<void> {
    this.entries.delete(entry.action.id);
    try {
      await entry.run();
      this.emit({ type: "performed", action: entry.action });
    } catch (error) {
      this.emit({ type: "failed", action: entry.action, error });
    }
  }

  /**
   * The label of an action: the room's short name, falling back to the
   * canonical name for rooms outside the catalog
   */
  private labelFor(room: string): string {
    return this.rooms.all().find((r) => r.canonicalName === room)?.shortName ??
      room;
  }

  private emit(event: PendingActionEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}
