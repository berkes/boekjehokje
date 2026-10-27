/**
 * Google Calendar API error
 *
 * Domain-specific error for calendar API operations. Wraps Google API
 * errors to prevent leaking Google-specific details. The low-level HTTP
 * client lives in utils/calendar/GoogleCalendarApiClient.ts.
 */

/**
 * Domain-specific error for calendar API operations
 * Wraps Google API errors to prevent leaking Google-specific details
 */
export class CalendarApiError extends Error {
  public readonly statusCode?: number;
  public readonly originalError?: Error;

  constructor(
    message: string,
    statusCode?: number,
    originalError?: Error,
  ) {
    super(message);
    this.name = "CalendarApiError";
    this.statusCode = statusCode;
    this.originalError = originalError;

    // Maintain proper stack trace
    // Note: Error.captureStackTrace is a Node.js specific feature
    // For browser environments, the stack trace will be set automatically
  }
}
