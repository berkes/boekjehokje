/**
 * Test service trees
 *
 * buildTestServices composes a subset of the real service tree with the
 * central fakes as dependencies — the same shape the composition root in
 * App.tsx builds, but with fakes for every repository and for the
 * authentication service. Unit tests use it (or the individual fakes) to
 * test one service without the state of others; integration tests in
 * tests/integration use it to test the interaction of two real services.
 */
import { CalendarService } from "../services/calendar/CalendarService.ts";
import type { StoredEvent } from "../services/calendar/CalendarEventRepositoryPort.ts";
import { PermissionService } from "../services/permissions/PermissionService.ts";
import { PreferencesService } from "../services/preferences/PreferencesService.ts";
import type { AuthenticationServicePort } from "../services/authentication/AuthenticationServicePort.ts";
import type { CalendarServicePort } from "../services/calendar/CalendarServicePort.ts";
import type { ClockPort } from "../services/clock/ClockPort.ts";
import type { PermissionServicePort } from "../services/permissions/PermissionServicePort.ts";
import type { PreferencesPort } from "../services/preferences/PreferencesPort.ts";
import type { AuthenticatedUser } from "../services/authentication/AuthenticationServicePort.ts";
import { FakeAuthenticationService, fakeSession } from "./authentication.ts";
import { FakeCalendarEventRepository } from "./calendar.ts";
import { FakeClock } from "./clock.ts";
import { InMemoryKeyValueStore, InMemorySessionStorage } from "./storage.ts";

/**
 * A test tree: the composed services plus the fakes behind them
 */
export interface TestServices {
  services: {
    authentication: AuthenticationServicePort;
    calendar: CalendarServicePort;
    permissions: PermissionServicePort;
    clock: ClockPort;
    preferences: PreferencesPort;
  };
  fakes: {
    authentication: FakeAuthenticationService;
    events: FakeCalendarEventRepository;
    clock: FakeClock;
    store: InMemoryKeyValueStore;
    sessionStorage: InMemorySessionStorage;
  };
}

/**
 * Options for buildTestServices
 */
export interface TestServicesOptions {
  /** The signed-in user (null: signed out; default: the fake user) */
  user?: AuthenticatedUser | null;
  /** The events the fake calendar repository starts with */
  events?: StoredEvent[];
  /** The fixed "now" of the fake clock */
  now?: Date;
}

/**
 * Compose a subset of the real service tree over the central fakes
 */
export function buildTestServices(
  options: TestServicesOptions = {},
): TestServices {
  const clock = new FakeClock(options.now);
  const sessionStorage = new InMemorySessionStorage();
  const authentication = new FakeAuthenticationService(
    options.user === null ? null : fakeSession(options.user ?? undefined),
  );
  const permissions = new PermissionService({ authentication });
  const events = new FakeCalendarEventRepository(options.events ?? []);
  const calendar = new CalendarService({ events, permissions, clock });
  const store = new InMemoryKeyValueStore();
  const preferences = new PreferencesService({ store });

  return {
    services: { authentication, calendar, permissions, clock, preferences },
    fakes: { authentication, events, clock, store, sessionStorage },
  };
}
