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
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  created: string;
  updated: string;
  status: string;
  sequence: number;
}
