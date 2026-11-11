/**
 * Preferences port (input port of the preferences service)
 *
 * The user preferences the app keeps on the user's own device (never
 * business data): the booker name and contact the bookings carry (issue
 * #18) and the set of hidden room columns. The port speaks domain language;
 * persistence goes through the KeyValueStorePort repository.
 */
export interface PreferencesPort {
  /**
   * The booker name the app uses for bookings (issue #18), or "" when none
   * was stored — then the Google profile name is the fallback
   */
  getBookerName(): string;
  /** Store the booker name the app uses for bookings */
  saveBookerName(name: string): void;
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
