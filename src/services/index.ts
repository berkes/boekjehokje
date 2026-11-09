/**
 * Services - public API of the service layer
 *
 * One barrel for the whole service layer: each service module under
 * services/ exports its public API from its own index.ts, re-exported
 * here. The Services interface describes the service tree the composition
 * root (App.tsx) builds once and provides to the app through the hooks.
 */

export type {
  AuthenticatedUser,
  AuthenticationServicePort,
  AuthenticationSession,
  AuthenticationTokens,
} from "./authentication/AuthenticationServicePort.ts";
export type { AuthenticationProviderPort } from "./authentication/AuthenticationProviderPort.ts";
export { AuthenticationService } from "./authentication/AuthenticationService.ts";
export { GoogleAuthenticationAdapter } from "./authentication/GoogleAuthenticationAdapter.ts";
export { SessionStorageError } from "./authentication/SessionStoragePort.ts";
export type { SessionStoragePort } from "./authentication/SessionStoragePort.ts";
export {
  AUTHENTICATION_STORAGE_KEY,
  LocalSessionStorageAdapter,
} from "./authentication/LocalSessionStorageAdapter.ts";

export type {
  Booking,
  BookingEventSource,
  BookingUpdate,
  CalendarServicePort,
  DayRange,
  NewBooking,
  Room,
} from "./calendar/CalendarServicePort.ts";
export { getDayRange } from "./calendar/CalendarServicePort.ts";
export type {
  CalendarEventRepositoryPort,
  EventDraft,
  StoredEvent,
} from "./calendar/CalendarEventRepositoryPort.ts";
export { CalendarApiError } from "./calendar/CalendarEventRepositoryPort.ts";
export { CalendarService } from "./calendar/CalendarService.ts";
export {
  CALENDAR_ID,
  GoogleCalendarRepositoryAdapter,
} from "./calendar/GoogleCalendarRepositoryAdapter.ts";
export { DemoCalendarRepositoryAdapter } from "./calendar/DemoCalendarRepositoryAdapter.ts";

export type {
  EventFormatPort,
  ParsedEvent,
} from "./eventformat/EventFormatPort.ts";
export { EventFormatService } from "./eventformat/EventFormatService.ts";

export type {
  OverlapsPort,
  RoomWithBookings,
} from "./overlaps/OverlapsPort.ts";
export { OverlapsService } from "./overlaps/OverlapsService.ts";

export type {
  RoomDefinition,
  RoomMention,
  RoomsPort,
} from "./rooms/RoomsPort.ts";
export {
  RoomsService,
  UNKNOWN_ROOM,
  UNKNOWN_ROOM_DESCRIPTION,
} from "./rooms/index.ts";

export type {
  BookingSubject,
  PermissionAction,
  PermissionServicePort,
} from "./permissions/PermissionServicePort.ts";
export { PermissionService } from "./permissions/PermissionService.ts";

export type { ClockPort } from "./clock/ClockPort.ts";
export { ClockService } from "./clock/ClockService.ts";
export {
  endOfDay,
  isSameDay,
  longDateLabel,
  startOfDay,
  startOfWeek,
  type WeekdayOption,
  weekdayOptions,
} from "./clock/ClockService.ts";

export type { KeyValueStorePort } from "./preferences/KeyValueStorePort.ts";
export { LocalStorageAdapter } from "./preferences/LocalStorageAdapter.ts";
export type { PreferencesPort } from "./preferences/PreferencesPort.ts";
export { PreferencesService } from "./preferences/PreferencesService.ts";

import type { AuthenticationServicePort } from "./authentication/AuthenticationServicePort.ts";
import type { CalendarServicePort } from "./calendar/CalendarServicePort.ts";
import type { ClockPort } from "./clock/ClockPort.ts";
import type { EventFormatPort } from "./eventformat/EventFormatPort.ts";
import type { OverlapsPort } from "./overlaps/OverlapsPort.ts";
import type { PermissionServicePort } from "./permissions/PermissionServicePort.ts";
import type { PreferencesPort } from "./preferences/PreferencesPort.ts";
import type { RoomsPort } from "./rooms/RoomsPort.ts";

/**
 * The service tree: every service of the app, as the composition root
 * (App.tsx) builds it and the hooks provide it. All dependencies are
 * injected at creation; services never touch React state.
 */
export interface Services {
  /** Authentication: login, logout, the current session */
  authentication: AuthenticationServicePort;
  /** Calendar: rooms with bookings, and the booking write operations */
  calendar: CalendarServicePort;
  /** Event format: parse/serialize the standardized event format */
  eventFormat: EventFormatPort;
  /** Overlaps: candidate-vs-existing booking overlap detection (#16) */
  overlaps: OverlapsPort;
  /** Permissions: what the current user may do (ADR-0004) */
  permissions: PermissionServicePort;
  /** Rooms: the room catalog */
  rooms: RoomsPort;
  /** The clock: the single source of "now" */
  clock: ClockPort;
  /** User preferences persisted on the device (never business data) */
  preferences: PreferencesPort;
}
