/**
 * Unit tests for the authentication service
 *
 * The service is tested through its public interface
 * (AuthenticationServicePort) with the central fakes from src/testing: a
 * FakeAuthenticationProvider as the identity provider and an in-memory
 * session storage repository, plus an injected clock for the expiry math.
 */

import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  FakeAuthenticationProvider,
  fakeTokens,
  fakeUser,
  InMemorySessionStorage,
} from "../../../testing/index.ts";
import { AuthenticationService } from "../AuthenticationService.ts";

/** Fixed point in time for deterministic expiry math */
const NOW = 1_730_000_000_000;

function makeService(
  provider: FakeAuthenticationProvider = new FakeAuthenticationProvider(),
  storage: InMemorySessionStorage = new InMemorySessionStorage(),
) {
  const service = new AuthenticationService({
    provider,
    sessionStorage: storage,
    now: () => NOW,
  });
  return { service, provider, storage };
}

Deno.test("login runs the provider flow, persists the session and returns the user", async () => {
  const provider = new FakeAuthenticationProvider({
    tokens: { ...fakeTokens(), expiresAt: NOW + 3_600_000 },
    user: fakeUser,
  });
  const { service, storage } = makeService(provider);

  const user = await service.login();

  assertEquals(user, fakeUser);
  assert(service.isAuthenticated());
  assertEquals(service.getAuthenticatedUser(), fakeUser);
  assertEquals(storage.load(), {
    user: fakeUser,
    tokens: { ...fakeTokens(), expiresAt: NOW + 3_600_000 },
  });
  assertEquals(service.getTokens()?.accessToken, fakeTokens().accessToken);
});

Deno.test("login falls back to a minimal user when the profile cannot be fetched", async () => {
  const provider = new FakeAuthenticationProvider({
    profileError: new Error("People API down"),
  });
  const { service, storage } = makeService(provider);

  const user = await service.login();

  assertEquals(user, {
    name: "Onbekend",
    email: "unknown@example.com",
  });
  assertEquals(storage.load()?.user, user);
  assert(service.isAuthenticated());
});

Deno.test("login rejects and stores nothing when the provider login fails", async () => {
  const provider = new FakeAuthenticationProvider();
  provider.login = () =>
    Promise.reject(new Error("Google authentication failed"));
  const { service, storage } = makeService(provider);

  await assertRejects(
    () => service.login(),
    Error,
    "Google authentication failed",
  );

  assertEquals(storage.load(), null);
  assertEquals(service.isAuthenticated(), false);
  assertEquals(service.getAuthenticatedUser(), null);
  assertEquals(service.getTokens(), null);
});

Deno.test("a stored session is restored without logging in again", () => {
  const storage = new InMemorySessionStorage();
  storage.save({
    user: fakeUser,
    tokens: { ...fakeTokens(), expiresAt: NOW + 1_000 },
  });
  const { service } = makeService(new FakeAuthenticationProvider(), storage);

  assert(service.isAuthenticated());
  assertEquals(service.getAuthenticatedUser(), fakeUser);
  assertEquals(service.getTokens()?.accessToken, fakeTokens().accessToken);
});

Deno.test("an expired session is discarded", () => {
  const storage = new InMemorySessionStorage();
  storage.save({
    user: fakeUser,
    tokens: { ...fakeTokens(), expiresAt: NOW },
  });
  const { service } = makeService(new FakeAuthenticationProvider(), storage);

  assertEquals(service.isAuthenticated(), false);
  assertEquals(service.getAuthenticatedUser(), null);
  assertEquals(service.getTokens(), null);
  assertEquals(storage.load(), null);
});

Deno.test("logout clears the stored session", async () => {
  const { service, storage } = makeService();

  await service.login();
  service.logout();

  assertEquals(storage.load(), null);
  assertEquals(service.isAuthenticated(), false);
  assertEquals(service.getAuthenticatedUser(), null);
  assertEquals(service.getTokens(), null);
});

Deno.test("fetchProfile delegates to the provider", async () => {
  const { service } = makeService();

  assertEquals(await service.fetchProfile("some-token"), fakeUser);
});
