/**
 * Calendar repository fake for tests
 *
 * A FakeCalendarEventRepository implements the CalendarEventRepositoryPort
 * with an in-memory event list and records the writes, so tests of the
 * calendar service (and integration tests with the permission service)
 * need no spies or HTTP stubs. The storedEvent factory builds fixture
 * events in the port's neutral language.
 */
import type {
  CalendarEventRepositoryPort,
  EventDraft,
  StoredEvent,
} from "../services/calendar/CalendarEventRepositoryPort.ts";
import type { DayRange } from "../services/calendar/CalendarServicePort.ts";

/**
 * Build a stored event fixture. Only id, summary, start and end are
 * required; the rest gets sensible defaults (creator "boeker@example.com").
 */
export function storedEvent(
  id: string,
  summary: string,
  start: Date,
  end: Date,
  overrides: Partial<StoredEvent> = {},
): StoredEvent {
  return {
    id,
    uid: `${id}@example.com`,
    summary,
    htmlLink: null,
    creatorEmail: "boeker@example.com",
    start,
    end,
    created: new Date("2026-10-05T09:00:00Z"),
    status: "confirmed",
    sequence: 0,
    ...overrides,
  };
}

/**
 * A write the fake repository recorded: the draft handed to create/update
 * plus the event id (update/delete)
 */
export interface RecordedWrite {
  kind: "create" | "update" | "delete";
  eventId: string;
  draft?: EventDraft;
}

/**
 * In-memory calendar event repository (CalendarEventRepositoryPort)
 *
 * fetchEvents serves the events overlapping the queried range; the write
 * operations echo the draft back as a stored event — like the calendar
 * source does after its write — and record every call in `writes`.
 */
export class FakeCalendarEventRepository
  implements CalendarEventRepositoryPort {
  private events: StoredEvent[];
  private counter = 0;
  /** Every write, in order */
  readonly writes: RecordedWrite[] = [];
  /** Every fetched range, in order */
  readonly fetches: DayRange[] = [];

  constructor(events: StoredEvent[] = []) {
    this.events = [...events];
  }

  /** The events currently stored */
  get stored(): StoredEvent[] {
    return [...this.events];
  }

  fetchEvents(range: DayRange): Promise<StoredEvent[]> {
    this.fetches.push(range);
    return Promise.resolve(
      this.events.filter((event) =>
        event.start < range.end && event.end > range.start
      ),
    );
  }

  createEvent(draft: EventDraft): Promise<StoredEvent> {
    const id = `fake-created-${this.counter++}`;
    this.writes.push({ kind: "create", eventId: id, draft });
    const stored = this.echo(draft, id);
    this.events.push(stored);
    return Promise.resolve(stored);
  }

  updateEvent(eventId: string, draft: EventDraft): Promise<StoredEvent> {
    this.writes.push({ kind: "update", eventId, draft });
    const stored = this.echo(draft, eventId);
    this.events = this.events.map((event) =>
      event.id === eventId ? stored : event
    );
    return Promise.resolve(stored);
  }

  deleteEvent(eventId: string): Promise<void> {
    this.writes.push({ kind: "delete", eventId });
    this.events = this.events.filter((event) => event.id !== eventId);
    return Promise.resolve();
  }

  /**
   * Echo a draft back as a stored event, like the calendar source does
   * after its write (with an id and creator)
   */
  private echo(draft: EventDraft, id: string): StoredEvent {
    return storedEvent(id, draft.summary, draft.start, draft.end, {
      creatorEmail: "ber@boekjehokje.test",
    });
  }
}
