/**
 * Shared types for calendar functionality
 */

/**
 * Google Calendar API event type
 * Used by both the API wrapper and the parser
 */
export interface CalendarEvent {
  id: string;
  uid: string;
  summary: string;
  /** Link to the event in the Google Calendar web UI, if the API provides one */
  htmlLink?: string;
  creator: {
    email?: string;
  };
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  created: string;
  updated: string;
  status: string;
  sequence: number;
}

/**
 * The writable fields of a calendar event: the standardized event format
 * (summary) plus the time range and the optional description. This is the
 * write-side counterpart of CalendarEvent — the inverse of parsing — and
 * the API client sends it as the request body of create/update calls.
 */
export interface CalendarEventDraft {
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}
