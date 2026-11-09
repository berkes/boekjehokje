/**
 * Unit tests for the Google authentication adapter (identity provider)
 *
 * The adapter implements the AuthenticationProviderPort: it normalizes
 * Google's OAuth responses into domain tokens (with an injected clock) and
 * fetches profiles from the People API (tested against a stubbed fetch).
 * Session handling is the AuthenticationService's job and tested in
 * AuthenticationService.test.ts.
 */

import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import type { AuthenticatedUser } from "../AuthenticationServicePort.ts";
import {
  GoogleAuthenticationAdapter,
  type GoogleOAuthResponse,
} from "../GoogleAuthenticationAdapter.ts";

/** Fixed point in time for deterministic expiry math */
const NOW = 1_730_000_000_000;

function makeAdapter(
  loginResponse: GoogleOAuthResponse = {
    access_token: "token-123",
    expires_in: 3600,
  },
  loginError: Error | null = null,
) {
  return new GoogleAuthenticationAdapter({
    initiateLogin: () =>
      loginError !== null
        ? Promise.reject(loginError)
        : Promise.resolve(loginResponse),
    now: () => NOW,
  });
}

Deno.test("login with a token response normalizes it into domain tokens", async () => {
  const adapter = makeAdapter();

  assertEquals(await adapter.login(), {
    accessToken: "token-123",
    expiresAt: NOW + 3_600_000,
    tokenType: "Bearer",
  });
});

Deno.test("login with a credential response assumes a one hour expiry", async () => {
  const adapter = makeAdapter({ credential: "id-token" });

  assertEquals(await adapter.login(), {
    accessToken: "id-token",
    expiresAt: NOW + 3_600_000,
    tokenType: "Bearer",
  });
});

Deno.test("login with a token response without expiry assumes a one hour expiry", async () => {
  const adapter = makeAdapter({ access_token: "token-123" });

  assertEquals((await adapter.login()).expiresAt, NOW + 3_600_000);
});

Deno.test("login rejects when the login flow fails", async () => {
  const adapter = makeAdapter(
    undefined,
    new Error("Google authentication failed"),
  );

  await assertRejects(
    () => adapter.login(),
    Error,
    "Google authentication failed",
  );
});

/** Creates an adapter with the real (People API) fetchProfile */
function createPeopleApiAdapter(): GoogleAuthenticationAdapter {
  return new GoogleAuthenticationAdapter({
    initiateLogin: () => Promise.resolve({ access_token: "unused" }),
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
    const user: AuthenticatedUser = await adapter.fetchProfile("token-123");

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
