/**
 * In-memory storage fakes for tests
 *
 * Repositories with in-memory backing: the session storage repository of
 * the authentication service and the key-value store repository of the
 * preferences service.
 */
import type { AuthenticationSession } from "../services/authentication/AuthenticationServicePort.ts";
import type { SessionStoragePort } from "../services/authentication/SessionStoragePort.ts";
import type { BrowserStorage } from "../services/preferences/LocalStorageAdapter.ts";
import type { KeyValueStorePort } from "../services/preferences/KeyValueStorePort.ts";

/**
 * In-memory session storage (SessionStoragePort)
 */
export class InMemorySessionStorage implements SessionStoragePort {
  private session: AuthenticationSession | null = null;

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

/**
 * In-memory key-value store (KeyValueStorePort)
 */
export class InMemoryKeyValueStore implements KeyValueStorePort {
  private data = new Map<string, string>();

  read(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  write(key: string, value: string): void {
    this.data.set(key, value);
  }
}

/**
 * In-memory browser storage (BrowserStorage, the surface
 * LocalSessionStorageAdapter and LocalStorageAdapter take)
 */
export class InMemoryBrowserStorage implements BrowserStorage {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}
