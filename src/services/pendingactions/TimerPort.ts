/**
 * Timer port (output port of the pending actions service)
 *
 * The pending actions service schedules its delayed writes through this
 * port, so tests can inject a fake timer and fire the delay manually.
 */

/**
 * An opaque handle for a scheduled callback
 */
export type TimerHandle = ReturnType<typeof globalThis.setTimeout>;

/**
 * The port every timer adapter must implement
 */
export interface TimerPort {
  /**
   * Run the callback once the delay has passed; returns the handle
   */
  after(delayMs: number, callback: () => void): TimerHandle;
  /**
   * Cancel a scheduled callback that has not run yet
   */
  cancel(handle: TimerHandle): void;
}
