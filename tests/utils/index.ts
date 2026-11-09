/**
 * Test support - public API
 *
 * The central set of fakes, fixtures and test-tree builders, so tests
 * never duplicate the building of mock dependencies: complex mocks come
 * from here, simple ones may be built in the test itself. Not part of the
 * app build; only imported by tests.
 */
export { FakeClock } from "./clock.ts";
export {
  FakeAuthenticationProvider,
  FakeAuthenticationService,
  fakeSession,
  fakeTokens,
  fakeUser,
} from "./authentication.ts";
export {
  InMemoryBrowserStorage,
  InMemoryKeyValueStore,
  InMemorySessionStorage,
} from "./storage.ts";
export {
  FakeCalendarEventRepository,
  type RecordedWrite,
  storedEvent,
} from "./calendar.ts";
export {
  buildTestServices,
  type TestServices,
  type TestServicesOptions,
} from "./services.ts";
