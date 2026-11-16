/**
 * Integration tests: calendar service + authentication service
 *
 * Two real services (CalendarService and AuthenticationService) over the
 * central fakes: when the calendar source rejects the access token with a
 * 401, the calendar service re-establishes the session through the real
 * authentication service (silent token re-request via the fake provider)
 * and retries once; when that fails, the session is gone and the service
 * reports SessionExpiredError instead of the raw API error (issue #23).
 * More than two services are covered by the E2E suite.
 */

import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  FakeAuthenticationProvider,
  FakeCalendarEventRepository,
  fakeTokens,
  fakeUser,
  InMemorySessionStorage,
  storedEvent,
} from "../utils/index.ts";
import { AuthenticationService } from "../../src/services/authentication/AuthenticationService.ts";
import {
  CalendarApiError,
  type StoredEvent,
} from "../../src/services/calendar/CalendarEventRepositoryPort.ts";
import { CalendarService } from "../../src/services/calendar/CalendarService.ts";
import {
  getDayRange,
  SessionExpiredError,
} from "../../src/services/calendar/CalendarServicePort.ts";
import { EventFormatService } from "../../src/services/eventformat/index.ts";
import { RoomsService } from "../../src/services/rooms/index.ts";
import type { PermissionServicePort } from "../../src/services/permissions/PermissionServicePort.ts";

/** Fixed point in time for deterministic expiry math */
const NOW = 1_730_000_000_000;

/** Tuesday 6 October 2026, midday local */
const DAY = new Date(2026, 9, 6, 12, 0);

function event(id: string): StoredEvent {
  return storedEvent(
    id,
    "Kletshok 05 - Sanne",
    new Date(2026, 9, 6, 10, 0),
    new Date(2026, 9, 6, 11, 0),
    { creatorEmail: "sanne@example.com" },
  );
}

/** Read-only permissions: editability is the permission service's job */
const readOnly: PermissionServicePort = { may: () => false };

function makeTree(
  provider: FakeAuthenticationProvider,
  storage: InMemorySessionStorage,
  repo: FakeCalendarEventRepository,
) {
  const authentication = new AuthenticationService({
    provider,
    sessionStorage: storage,
    now: () => NOW,
  });
  const rooms = new RoomsService();
  const calendar = new CalendarService({
    events: repo,
    authentication,
    permissions: readOnly,
    clock: { now: () => DAY },
    eventFormat: new EventFormatService({ rooms }),
    rooms,
  });
  return { calendar, authentication, provider, storage, repo };
}

Deno.test("a 401 with a still-active provider session is recovered: fresh token stored, fetch retried", async () => {
  const storage = new InMemorySessionStorage();
  storage.save({
    user: fakeUser,
    tokens: {
      ...fakeTokens(),
      accessToken: "expired-token",
      expiresAt: NOW + 60_000,
    },
  });
  const provider = new FakeAuthenticationProvider({
    tokens: {
      ...fakeTokens(),
      accessToken: "fresh-token",
      expiresAt: NOW + 3_600_000,
    },
  });
  const repo = new FakeCalendarEventRepository([event("event-1")]);
  repo.fetchError = new CalendarApiError(
    "Google Calendar API request failed: 401 - Request had invalid authentication credentials.",
    401,
  );
  const { calendar, authentication } = makeTree(provider, storage, repo);

  // The silent re-request succeeds (the provider session is active), so
  // the retry goes through
  const originalRefresh = provider.refreshAccessToken.bind(provider);
  provider.refreshAccessToken = () => {
    repo.fetchError = null;
    return originalRefresh();
  };

  const rooms = await calendar.getDay(DAY);

  assertEquals(repo.fetches.length, 2, "fetched again after the refresh");
  assertEquals(repo.fetches[0], getDayRange(DAY));
  assertEquals(
    rooms.flatMap((room) => room.bookings).map((b) => b.id),
    ["event-1"],
  );
  assertEquals(storage.load()?.tokens.accessToken, "fresh-token");
  assertEquals(storage.load()?.user, fakeUser);
  assert(authentication.isAuthenticated());
  assertEquals(authentication.getTokens()?.accessToken, "fresh-token");
});

Deno.test("a 401 without a provider session ends the session and reports SessionExpiredError", async () => {
  const storage = new InMemorySessionStorage();
  storage.save({ user: fakeUser, tokens: fakeTokens() });
  const provider = new FakeAuthenticationProvider({
    refreshError: new Error("no active Google session"),
  });
  const repo = new FakeCalendarEventRepository([event("event-1")]);
  repo.fetchError = new CalendarApiError("Unauthorized", 401);
  const { calendar, authentication } = makeTree(provider, storage, repo);

  const error = await assertRejects(
    () => calendar.getDay(DAY),
    SessionExpiredError,
  );

  assert(!error.message.includes("Google"), "no raw API error leaks");
  assertEquals(repo.fetches.length, 1, "no retry without a fresh token");
  assertEquals(storage.load(), null, "the stored session is discarded");
  assert(!authentication.isAuthenticated());
});
