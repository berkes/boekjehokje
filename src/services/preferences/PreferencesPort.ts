/**
 * Preferences port (input port of the preferences service)
 *
 * The user preferences the app keeps on the user's own device (never
 * business data): the last-used booker contact and the set of hidden room
 * columns. The port speaks domain language; persistence goes through the
 * KeyValueStorePort repository.
 */
export interface PreferencesPort {
  /**
   * The last-used booker contact of the booking form, or "" when none was
   * stored
   */
  getBookerContact(): string;
  /** Store the last-used booker contact */
  saveBookerContact(contact: string): void;
  /**
   * The canonical names of the hidden room columns, or an empty set when
   * nothing (valid) was stored
   */
  getHiddenRooms(): ReadonlySet<string>;
  /** Store the set of hidden room columns */
  saveHiddenRooms(hidden: ReadonlySet<string>): void;
}
