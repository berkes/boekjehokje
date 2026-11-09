/**
 * Google Calendar API shapes
 *
 * Private to this module: the raw JSON shapes of the Google Calendar API
 * (events list/GET, and the writable draft of POST/PATCH bodies). Only
 * GoogleCalendarRepositoryAdapter sees these; everywhere else speaks
 * StoredEvent / EventDraft (see CalendarEventRepositoryPort.ts).
 */

/**
 * Google Calendar API event resource, as returned by the API
 */
export interface GoogleCalendarEvent {
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
 * The writable fields of a Google Calendar event (POST/PATCH body)
 */
export interface GoogleCalendarEventDraft {
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
}
