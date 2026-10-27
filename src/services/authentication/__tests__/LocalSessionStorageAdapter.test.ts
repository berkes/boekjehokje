/**
 * Unit tests for LocalSessionStorageAdapter
 *
 * Uses an in-memory BrowserStorage fake; no real localStorage is touched.
 */

import { assert, assertEquals, assertThrows } from "@std/assert";
import type { AuthenticationSession } from "../AuthenticationServicePort.ts";
import {
  AUTHENTICATION_STORAGE_KEY,
  type BrowserStorage,
  LocalSessionStorageAdapter,
} from "../LocalSessionStorageAdapter.ts";
import { SessionStorageError } from "../SessionStoragePort.ts";

/** In-memory BrowserStorage fake */
class MemoryBrowserStorage implements BrowserStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

function createSession(
  overrides: Partial<AuthenticationSession["tokens"]> = {},
): AuthenticationSession {
  return {
    user: { name: "Test Gebruiker", email: "test@example.com" },
    tokens: {
      accessToken: "token-123",
      expiresAt: 4_102_444_800_000,
      tokenType: "Bearer",
      ...overrides,
    },
  };
}

Deno.test("save and load roundtrip the session", () => {
  const storage = new MemoryBrowserStorage();
  const adapter = new LocalSessionStorageAdapter(storage);
  const session = createSession();

  adapter.save(session);

  assertEquals(adapter.load(), session);
});

Deno.test("save writes to the documented storage key", () => {
  const storage = new MemoryBrowserStorage();
  const adapter = new LocalSessionStorageAdapter(storage);
  const session = createSession();

  adapter.save(session);

  assertEquals(
    storage.getItem(AUTHENTICATION_STORAGE_KEY),
    JSON.stringify(session),
  );
});

Deno.test("load returns null when nothing is stored", () => {
  const adapter = new LocalSessionStorageAdapter(new MemoryBrowserStorage());

  assertEquals(adapter.load(), null);
});

Deno.test("clear removes the stored session", () => {
  const storage = new MemoryBrowserStorage();
  const adapter = new LocalSessionStorageAdapter(storage);
  adapter.save(createSession());

  adapter.clear();

  assertEquals(adapter.load(), null);
});

Deno.test("load returns null for malformed JSON", () => {
  const storage = new MemoryBrowserStorage();
  storage.setItem(AUTHENTICATION_STORAGE_KEY, "{not json");
  const adapter = new LocalSessionStorageAdapter(storage);

  assertEquals(adapter.load(), null);
});

Deno.test("load returns null for an unexpected shape", () => {
  const storage = new MemoryBrowserStorage();
  const adapter = new LocalSessionStorageAdapter(storage);

  storage.setItem(
    AUTHENTICATION_STORAGE_KEY,
    JSON.stringify({ tokens: { accessToken: "token-123" } }),
  );
  assertEquals(adapter.load(), null);

  storage.setItem(AUTHENTICATION_STORAGE_KEY, JSON.stringify("a string"));
  assertEquals(adapter.load(), null);

  storage.setItem(
    AUTHENTICATION_STORAGE_KEY,
    JSON.stringify({
      user: { name: "Test" },
      tokens: { accessToken: "token-123", expiresAt: "soon", tokenType: 1 },
    }),
  );
  assertEquals(adapter.load(), null);
});

/** A storage whose operations all fail */
function failingStorage(operation: string): BrowserStorage {
  const fail = () => {
    throw new Error(`storage unavailable (${operation})`);
  };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

Deno.test("save raises a SessionStorageError when the storage fails", () => {
  const adapter = new LocalSessionStorageAdapter(failingStorage("setItem"));

  const error = assertThrows(
    () => adapter.save(createSession()),
    SessionStorageError,
    "Could not persist authentication session",
  );
  assert(error.cause instanceof Error);
  assertEquals(error.cause.message, "storage unavailable (setItem)");
});

Deno.test("load raises a SessionStorageError when the storage fails", () => {
  const adapter = new LocalSessionStorageAdapter(failingStorage("getItem"));

  const error = assertThrows(
    () => adapter.load(),
    SessionStorageError,
    "Could not load the stored authentication session",
  );
  assert(error.cause instanceof Error);
  assertEquals(error.cause.message, "storage unavailable (getItem)");
});

Deno.test("clear raises a SessionStorageError when the storage fails", () => {
  const adapter = new LocalSessionStorageAdapter(failingStorage("removeItem"));

  const error = assertThrows(
    () => adapter.clear(),
    SessionStorageError,
    "Could not clear the stored authentication session",
  );
  assert(error.cause instanceof Error);
  assertEquals(error.cause.message, "storage unavailable (removeItem)");
});
