/**
 * Local storage repository adapter
 *
 * Persists key-value data in the browser's localStorage. The adapter stays
 * dumb: it only stores what it is handed and propagates storage failures;
 * deciding that a lost preference is non-essential is the preferences
 * service's job.
 */

import type { KeyValueStorePort } from "./KeyValueStorePort.ts";

/**
 * Minimal storage surface, so tests can inject an in-memory implementation
 */
export type BrowserStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/**
 * Key-value store backed by localStorage
 */
export class LocalStorageAdapter implements KeyValueStorePort {
  private storage: BrowserStorage;

  /**
   * Create a new local storage adapter
   *
   * @param storage - Storage implementation (defaults to localStorage)
   */
  constructor(storage: BrowserStorage = globalThis.localStorage) {
    this.storage = storage;
  }

  read(key: string): string | null {
    return this.storage.getItem(key);
  }

  write(key: string, value: string): void {
    this.storage.setItem(key, value);
  }
}
