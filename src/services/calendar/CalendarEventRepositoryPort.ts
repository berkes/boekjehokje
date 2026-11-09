/**
 * Calendar event repository port (output port of the calendar service)
 *
 * The port through which the calendar service reads and writes events on
 * an external calendar source (Google Calendar, the demo data, a fake in
 * tests). Implementations are repositories/adapters:
 * GoogleCalendarRepositoryAdapter talks REST to Google Calendar,
 * DemoCalendarRepositoryAdapter serves hardcoded demo events.
 *
 * The port speaks a neutral event language (StoredEvent / EventDraft) in
 * domain terms — plain Dates, creator email, html link — so no Google
 * shapes leak into the service or the UI. The Google adapter translates
 * between this language and Google's JSON shapes.
 */

import type { DayRange } from "./CalendarServicePort.ts";

/**
 * A calendar event as stored by the external calendar source, in neutral
 * domain terms (all Google specifics already mapped away by the adapter)
 */
export interface StoredEvent {
  id: string;
  uid: string;
  summary: string;
  /** Link to the event in the calendar source's web UI, null when the source has none */
  htmlLink: string | null;
  /** Email of the event's creator */
  creatorEmail: string;
  start: Date;
  end: Date;
  created: Date;
  status: string;
  sequence: number;
}

/**
 * The writable fields of an event on the calendar source, in domain
 * language: the standardized event format's summary and description plus
 * the time range. This is the write-side counterpart of StoredEvent.
 */
export interface EventDraft {
  summary: string;
  description?: string;
  start: Date;
  end: Date;
}

/**
 * The repository port every calendar event source must implement
 */
export interface CalendarEventRepositoryPort {
  /**
   * Fetch the events of the calendar source overlapping the given day
   * range (local midnight to local midnight)
   */
  fetchEvents(range: DayRange): Promise<StoredEvent[]>;

  /**
   * Create a new event on the calendar source
   *
   * @returns The created event, as the source stored it
   */
  createEvent(draft: EventDraft): Promise<StoredEvent>;

  /**
   * Update an existing event on the calendar source
   *
   * @returns The updated event, as the source stored it
   */
  updateEvent(eventId: string, draft: EventDraft): Promise<StoredEvent>;

  /**
   * Delete an event from the calendar source
   */
  deleteEvent(eventId: string): Promise<void>;
}
