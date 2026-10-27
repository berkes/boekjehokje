/**
 * Unit tests for GoogleAuthenticationAdapter
 *
 * Uses a fake login flow, an in-memory SessionStoragePort, a subclass with a
 * faked fetchProfile, and an injected clock: no Google, browser, or network
 * involved. The real fetchProfile (People API) is tested separately against
 * a stubbed fetch.
 */

import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import type {
  AuthenticatedUser,
  AuthenticationSession,
} from "../AuthenticationServicePort.ts";
import {
  GoogleAuthenticationAdapter,
  type GoogleOAuthResponse,
} from "../GoogleAuthenticationAdapter.ts";
import type { SessionStoragePort } from "../SessionStoragePort.ts";

/** In-memory SessionStoragePort fake */
class MemorySessionStorageAdapter implements SessionStoragePort {
  session: AuthenticationSession | null = null;

  save(session: AuthenticationSession): void {
    this.session = session;
  }

  load(): AuthenticationSession | null {
    return this.session;
  }

  clear(): void {
    this.session = null;
  }
}

const TEST_USER: AuthenticatedUser = {
  name: "Test Gebruiker",
  email: "test@example.com",
  picture: "https://example.com/photo.jpg",
};

/** Fixed point in time for deterministic expiry math */
const NOW = 1_730_000_000_000;

/**
 * GoogleAuthenticationAdapter with faked login flow and fetchProfile, for
 * testing the service behavior without the People API.
 */
class FakeProfileAdapter extends GoogleAuthenticationAdapter {
  loginResponse: GoogleOAuthResponse = {
    access_token: "token-123",
    expires_in: 3600,
  };
  loginError: Error | null = null;
  profile: AuthenticatedUser = TEST_USER;
  profileError: Error | null = null;

  constructor(sessionStorage: SessionStoragePort) {
    super({
      initiateLogin: () => {
        if (this.loginError !== null) {
          return Promise.reject(this.loginError);
        }
        return Promise.resolve(this.loginResponse);
      },
      sessionStorage,
      now: () => NOW,
    });
  }

  override fetchProfile(_accessToken: string): Promise<AuthenticatedUser> {
    if (this.profileError !== null) {
      return Promise.reject(this.profileError);
    }
    return Promise.resolve(this.profile);
  }
}

function createHarness(
  storage: MemorySessionStorageAdapter = new MemorySessionStorageAdapter(),
) {
  const adapter = new FakeProfileAdapter(storage);
  return { adapter, storage };
}

Deno.test("login with a token response stores the session and returns the user", async () => {
  const { adapter, storage } = createHarness();

  const user = await adapter.login();

  assertEquals(user, TEST_USER);
  assert(adapter.isAuthenticated());
  assertEquals(adapter.getAuthenticatedUser(), TEST_USER);
  assertEquals(storage.session, {
    user: TEST_USER,
    tokens: {
      accessToken: "token-123",
      expiresAt: NOW + 3_600_000,
      tokenType: "Bearer",
    },
  });
  assertEquals(adapter.getTokens(), storage.session?.tokens);
});

Deno.test("login with a credential response assumes a one hour expiry", async () => {
  const { adapter, storage } = createHarness();
  adapter.loginResponse = { credential: "id-token" };

  await adapter.login();

  assertEquals(storage.session?.tokens, {
    accessToken: "id-token",
    expiresAt: NOW + 3_600_000,
    tokenType: "Bearer",
  });
});

Deno.test("login with a token response without expiry assumes a one hour expiry", async () => {
  const { adapter, storage } = createHarness();
  adapter.loginResponse = { access_token: "token-123" };

  await adapter.login();

  assertEquals(storage.session?.tokens?.expiresAt, NOW + 3_600_000);
});

Deno.test("login falls back to a minimal user when the profile cannot be fetched", async () => {
  const { adapter, storage } = createHarness();
  adapter.profileError = new Error("People API down");

  const user = await adapter.login();

  assertEquals(user, {
    name: "Onbekend",
    email: "unknown@example.com",
  });
  assertEquals(storage.session?.user, user);
  assert(adapter.isAuthenticated());
});

Deno.test("login rejects and stores nothing when the login flow fails", async () => {
  const { adapter, storage } = createHarness();
  adapter.loginError = new Error("Google authentication failed");

  await assertRejects(
    () => adapter.login(),
    Error,
    "Google authentication failed",
  );

  assertEquals(storage.session, null);
  assertEquals(adapter.isAuthenticated(), false);
  assertEquals(adapter.getAuthenticatedUser(), null);
  assertEquals(adapter.getTokens(), null);
});

Deno.test("a stored session is restored without logging in again", () => {
  const storage = new MemorySessionStorageAdapter();
  storage.session = {
    user: TEST_USER,
    tokens: {
      accessToken: "token-123",
      expiresAt: NOW + 1_000,
      tokenType: "Bearer",
    },
  };
  const { adapter } = createHarness(storage);

  assert(adapter.isAuthenticated());
  assertEquals(adapter.getAuthenticatedUser(), TEST_USER);
  assertEquals(adapter.getTokens()?.accessToken, "token-123");
});

Deno.test("an expired session is discarded", () => {
  const storage = new MemorySessionStorageAdapter();
  storage.session = {
    user: TEST_USER,
    tokens: {
      accessToken: "token-123",
      expiresAt: NOW,
      tokenType: "Bearer",
    },
  };
  const { adapter } = createHarness(storage);

  assertEquals(adapter.isAuthenticated(), false);
  assertEquals(adapter.getAuthenticatedUser(), null);
  assertEquals(adapter.getTokens(), null);
  assertEquals(storage.session, null);
});

Deno.test("logout clears the stored session", async () => {
  const { adapter, storage } = createHarness();

  await adapter.login();
  adapter.logout();

  assertEquals(storage.session, null);
  assertEquals(adapter.isAuthenticated(), false);
  assertEquals(adapter.getAuthenticatedUser(), null);
  assertEquals(adapter.getTokens(), null);
});

/** Creates an adapter with the real (People API) fetchProfile */
function createPeopleApiAdapter(): GoogleAuthenticationAdapter {
  return new GoogleAuthenticationAdapter({
    initiateLogin: () => Promise.resolve({ access_token: "unused" }),
    sessionStorage: new MemorySessionStorageAdapter(),
    now: () => NOW,
  });
}

Deno.test("fetchProfile returns our profile for a People API response", async () => {
  const fetchStub = stub(
    globalThis,
    "fetch",
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            names: [{ displayName: "Jan Jansen" }],
            emailAddresses: [{ value: "jan@example.com" }],
            photos: [{ url: "https://example.com/photo.jpg" }],
          }),
          { status: 200 },
        ),
      ),
  );

  try {
    const adapter = createPeopleApiAdapter();
    const user = await adapter.fetchProfile("token-123");

    assertEquals(user, {
      name: "Jan Jansen",
      email: "jan@example.com",
      picture: "https://example.com/photo.jpg",
    });

    const [url, init] = fetchStub.calls[0]?.args ?? [];
    assertEquals(
      url,
      "https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,photos",
    );
    assertEquals(
      (init?.headers as Record<string, string>).Authorization,
      "Bearer token-123",
    );
  } finally {
    fetchStub.restore();
  }
});

Deno.test("fetchProfile falls back to an unknown name when absent", async () => {
  const fetchStub = stub(
    globalThis,
    "fetch",
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ emailAddresses: [{ value: "jan@example.com" }] }),
          { status: 200 },
        ),
      ),
  );

  try {
    const adapter = createPeopleApiAdapter();

    assertEquals(await adapter.fetchProfile("token-123"), {
      name: "Onbekend",
      email: "jan@example.com",
    });
  } finally {
    fetchStub.restore();
  }
});

Deno.test("fetchProfile throws on a People API error response", async () => {
  const fetchStub = stub(
    globalThis,
    "fetch",
    () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ error: { message: "Invalid Credentials" } }),
          { status: 401, statusText: "Unauthorized" },
        ),
      ),
  );

  try {
    const adapter = createPeopleApiAdapter();

    await assertRejects(
      () => adapter.fetchProfile("token-123"),
      Error,
      "Google People API request failed: 401 Unauthorized - Invalid Credentials",
    );
  } finally {
    fetchStub.restore();
  }
});

Deno.test("fetchProfile throws when the response has no email", async () => {
  const fetchStub = stub(
    globalThis,
    "fetch",
    () =>
      Promise.resolve(
        new Response(JSON.stringify({ names: [{ displayName: "Jan" }] }), {
          status: 200,
        }),
      ),
  );

  try {
    const adapter = createPeopleApiAdapter();

    await assertRejects(
      () => adapter.fetchProfile("token-123"),
      Error,
      "No email found in Google People API response",
    );
  } finally {
    fetchStub.restore();
  }
});
