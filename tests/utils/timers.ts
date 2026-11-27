/**
 * Fake timer for tests
 *
 * A TimerPort that never fires on its own: callbacks are recorded with
 * their delay and fired manually (runAll), so tests of the pending
 * actions service (issue #36) control the undo delay deterministically.
 */
import type {
  TimerHandle,
  TimerPort,
} from "../../src/services/pendingactions/index.ts";

/**
 * A timer whose callbacks fire only when the test says so
 */
export class FakeTimer implements TimerPort {
  private nextHandle = 1;
  private entries = new Map<
    TimerHandle,
    { delayMs: number; callback: () => void; cancelled: boolean }
  >();

  after(delayMs: number, callback: () => void): TimerHandle {
    const handle: TimerHandle = this.nextHandle++;
    this.entries.set(handle, { delayMs, callback, cancelled: false });
    return handle;
  }

  cancel(handle: TimerHandle): void {
    const entry = this.entries.get(handle);
    if (entry) {
      entry.cancelled = true;
    }
  }

  /**
   * Fire every callback that has not been cancelled, as if its delay
   * had passed; the queue is empty afterwards
   */
  runAll(): void {
    const entries = [...this.entries.values()];
    this.entries.clear();
    for (const entry of entries) {
      if (!entry.cancelled) {
        entry.callback();
      }
    }
  }

  /**
   * The delays of the callbacks still scheduled and not cancelled
   */
  scheduledDelays(): number[] {
    return [...this.entries.values()]
      .filter((entry) => !entry.cancelled)
      .map((entry) => entry.delayMs);
  }

  /**
   * How many callbacks are still scheduled and not cancelled
   */
  get scheduledCount(): number {
    return this.scheduledDelays().length;
  }
}
