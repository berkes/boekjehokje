/**
 * Booker contact preference
 *
 * The booking form's contact field is pre-filled with the last-used
 * value. That value is a user preference, so it lives in localStorage
 * (never business data) until the settings page lands (issue #18).
 *
 * Storage access is injected so the functions stay unit-testable
 * without a browser environment.
 */

/** localStorage key for the last-used booker contact */
const BOOKER_CONTACT_STORAGE_KEY = "boekjehokje_booker_contact";

/**
 * Minimal storage surface needed to persist the preference
 */
export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * Read the last-used booker contact from localStorage.
 * Missing or invalid data yields an empty contact.
 */
export function loadBookerContact(
  storage: PreferenceStorage = globalThis.localStorage,
): string {
  try {
    const serialized = storage.getItem(BOOKER_CONTACT_STORAGE_KEY);
    if (serialized === null) {
      return "";
    }
    const parsed: unknown = JSON.parse(serialized);
    return typeof parsed === "string" ? parsed : "";
  } catch (error) {
    console.error("Failed to load booker contact:", error);
    return "";
  }
}

/**
 * Write the last-used booker contact to localStorage.
 * Failing to save is non-essential: the preference is simply not kept.
 */
export function saveBookerContact(
  contact: string,
  storage: PreferenceStorage = globalThis.localStorage,
): void {
  try {
    storage.setItem(BOOKER_CONTACT_STORAGE_KEY, JSON.stringify(contact));
  } catch (error) {
    console.error("Failed to save booker contact:", error);
  }
}
