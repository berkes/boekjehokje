/**
 * Fake clock for tests
 *
 * A ClockPort with a fixed, adjustable "now", so date-dependent services
 * and components can be tested deterministically.
 */
import type { ClockPort } from "../services/clock/ClockPort.ts";

/**
 * A clock that always returns the same instant, adjustable with setNow
 */
export class FakeClock implements ClockPort {
  private current: Date;

  constructor(now: Date = new Date("2026-10-28T10:00:00Z")) {
    this.current = now;
  }

  now(): Date {
    return new Date(this.current);
  }

  /** Move the clock to another instant */
  setNow(now: Date): void {
    this.current = now;
  }
}
