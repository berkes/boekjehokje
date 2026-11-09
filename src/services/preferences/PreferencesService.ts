/**
 * Preferences service
 *
 * Implements the PreferencesPort: the user preferences the app keeps in
 * localStorage (never business data) - the booking form's last-used
 * contact and the hidden room columns. The service owns the storage keys,
 * the serialization and the validation; the injected key-value store
 * repository stays dumb and only stores what it is handed.
 */

import type { KeyValueStorePort } from "./KeyValueStorePort.ts";
import type { PreferencesPort } from "./PreferencesPort.ts";

/** Storage key for the last-used booker contact */
const BOOKER_CONTACT_STORAGE_KEY = "boekjehokje_booker_contact";

/** Storage key for the set of hidden room ids */
const HIDDEN_ROOMS_STORAGE_KEY = "boekjehokje_hidden_rooms";

/**
 * The dependencies of the preferences service, passed in on creation
 */
export interface PreferencesServiceDeps {
  /** The key-value store repository to persist through */
  store: KeyValueStorePort;
}

/**
 * Preferences service
 */
export class PreferencesService implements PreferencesPort {
  private store: KeyValueStorePort;

  /**
   * Create a new preferences service
   *
   * @param deps - The injected dependency: the key-value store repository
   */
  constructor(deps: PreferencesServiceDeps) {
    this.store = deps.store;
  }

  /**
   * The last-used booker contact. Missing or invalid data yields an
   * empty contact. Storage failures are non-essential for preferences:
   * they are logged and swallowed, the preference is simply not kept.
   */
  getBookerContact(): string {
    const serialized = this.read(BOOKER_CONTACT_STORAGE_KEY);
    if (serialized === null) {
      return "";
    }
    try {
      const parsed: unknown = JSON.parse(serialized);
      return typeof parsed === "string" ? parsed : "";
    } catch {
      return "";
    }
  }

  /**
   * Store the last-used booker contact
   */
  saveBookerContact(contact: string): void {
    this.write(BOOKER_CONTACT_STORAGE_KEY, JSON.stringify(contact));
  }

  /**
   * The hidden room ids. Invalid or missing data yields an empty set:
   * all columns visible.
   */
  getHiddenRooms(): ReadonlySet<string> {
    const serialized = this.read(HIDDEN_ROOMS_STORAGE_KEY);
    if (serialized === null) {
      return new Set();
    }
    try {
      const parsed: unknown = JSON.parse(serialized);
      if (!Array.isArray(parsed)) {
        return new Set();
      }
      return new Set(
        parsed.filter((id): id is string => typeof id === "string"),
      );
    } catch {
      return new Set();
    }
  }

  /**
   * Store the hidden room ids
   */
  saveHiddenRooms(hidden: ReadonlySet<string>): void {
    this.write(
      HIDDEN_ROOMS_STORAGE_KEY,
      JSON.stringify([...hidden]),
    );
  }

  /**
   * Read through the store repository, swallowing storage failures
   * (non-essential for preferences)
   */
  private read(key: string): string | null {
    try {
      return this.store.read(key);
    } catch (error) {
      console.error("Failed to read the preference:", error);
      return null;
    }
  }

  /**
   * Write through the store repository, swallowing storage failures
   * (non-essential for preferences)
   */
  private write(key: string, value: string): void {
    try {
      this.store.write(key, value);
    } catch (error) {
      console.error("Failed to save the preference:", error);
    }
  }
}
