/**
 * System clock adapter
 *
 * The production ClockPort: reads the real current time.
 */
import type { ClockPort } from "./ClockPort.ts";

/**
 * The system clock, reading the real current time
 */
export class SystemClock implements ClockPort {
  now(): Date {
    return new Date();
  }
}
