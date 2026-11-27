/**
 * System timer adapter
 *
 * The production TimerPort: the real setTimeout/clearTimeout.
 */
import type { TimerPort } from "./TimerPort.ts";

/**
 * Timer adapter over the system timers
 */
export class SystemTimerAdapter implements TimerPort {
  after(delayMs: number, callback: () => void) {
    return globalThis.setTimeout(callback, delayMs);
  }

  cancel(handle: ReturnType<typeof globalThis.setTimeout>): void {
    globalThis.clearTimeout(handle);
  }
}
