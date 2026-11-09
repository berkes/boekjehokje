/**
 * Key-value store port (repository port of the preferences service)
 *
 * A dumb key-value store for persisting small pieces of data externally
 * (localStorage in production, in-memory in tests). The store only stores
 * what it is handed; parsing and validity are the preferences service's
 * job, not the store's.
 */
export interface KeyValueStorePort {
  /**
   * Read the value stored under the key, or null when nothing is stored
   */
  read(key: string): string | null;
  /**
   * Store the value under the key
   */
  write(key: string, value: string): void;
}
