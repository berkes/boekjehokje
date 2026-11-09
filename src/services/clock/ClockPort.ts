/**
 * Clock port (input port of the clock service)
 *
 * The single way the app asks for the current time. Components and other
 * services get a ClockPort instance injected (via the service tree), so
 * date-dependent logic can be tested with a fixed clock (see src/testing).
 */
export interface ClockPort {
  /** The current instant */
  now(): Date;
}
