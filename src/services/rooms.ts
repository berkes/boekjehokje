/**
 * Room configuration and types for CalendarService
 *
 * Contains Room class with canonicalName, shortName, aliases, and bookings.
 * This allows for extensibility with future attributes like image, location, description, etc.
 */

/**
 * A booking represents a room reservation
 */
export interface Booking {
  id: string;
  uid: string;
  summary: string;
  room: string;
  booker: string | null;
  details: {
    originalName: string;
    author: string;
  };
  start: Date;
  end: Date;
}

/**
 * A meeting room with its various identifiers and bookings
 */
export class Room {
  readonly canonicalName: string;
  readonly shortName: string;
  readonly aliases: string[];
  private _bookings: Booking[] = [];

  constructor(
    canonicalName: string,
    shortName: string,
    aliases: string[],
  ) {
    this.canonicalName = canonicalName;
    this.shortName = shortName;
    this.aliases = aliases;
  }

  /**
   * Get all bookings for this room
   */
  get bookings(): Booking[] {
    return this._bookings;
  }

  /**
   * Set bookings for this room
   */
  set bookings(bookings: Booking[]) {
    this._bookings = bookings;
  }

  /**
   * Get bookings for today
   */
  todayBookings(): Booking[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this._bookings.filter((booking) => {
      const bookingDate = new Date(booking.start);
      bookingDate.setHours(0, 0, 0, 0);

      return bookingDate.getTime() === today.getTime();
    });
  }

  /**
   * Get bookings for previous days (before today)
   */
  previousBookings(): Booking[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this._bookings.filter((booking) => {
      const bookingDate = new Date(booking.start);
      bookingDate.setHours(0, 0, 0, 0);

      return bookingDate.getTime() < today.getTime();
    });
  }

  /**
   * Get bookings for future days (after today)
   */
  futureBookings(): Booking[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this._bookings.filter((booking) => {
      const bookingDate = new Date(booking.start);
      bookingDate.setHours(0, 0, 0, 0);

      return bookingDate.getTime() > today.getTime();
    });
  }

  /**
   * Get bookings for next days (tomorrow and later this week)
   * This is a subset of futureBookings, excluding today
   */
  nextDaysBookings(): Booking[] {
    return this.futureBookings();
  }

  /**
   * Get count of bookings for next days (tomorrow and later)
   */
  nextDaysCount(): number {
    return this.nextDaysBookings().length;
  }

  /**
   * Check if there are bookings for today
   */
  hasTodayBookings(): boolean {
    return this.todayBookings().length > 0;
  }

  /**
   * Check if there are bookings for previous days
   */
  hasPreviousBookings(): boolean {
    return this.previousBookings().length > 0;
  }

  /**
   * Check if there are bookings for future days
   */
  hasFutureBookings(): boolean {
    return this.futureBookings().length > 0;
  }

  /**
   * Add a single booking to this room
   */
  addBooking(booking: Booking): void {
    this._bookings.push(booking);
  }

  /**
   * Check if this room matches a given identifier (canonical name or alias)
   */
  matchesIdentifier(identifier: string): boolean {
    const normalized = identifier.toLowerCase().trim();

    // Check canonical name
    if (this.canonicalName.toLowerCase() === normalized) {
      return true;
    }

    // Check short name
    if (this.shortName.toLowerCase() === normalized) {
      return true;
    }

    // Check aliases
    return this.aliases.some((alias) =>
      alias.toLowerCase().trim() === normalized
    );
  }
}

/**
 * Special room name for events that couldn't be parsed
 */
export const UNKNOWN_ROOM = "Unknown" as const;

/**
 * Description shown for bookings that could not be matched to a room
 */
export const UNKNOWN_ROOM_DESCRIPTION =
  "Boekingen die we niet konden koppelen, bijvoorbeeld door een typefout";

/**
 * Type for all possible room names (canonical names + unknown)
 */
export type RoomName = string;

/**
 * The special Unknown room instance for events that couldn't be matched
 */
export const UNKNOWN_ROOM_INSTANCE = new Room(
  UNKNOWN_ROOM,
  UNKNOWN_ROOM,
  [],
);

/**
 * All defined rooms with their canonical names, short names, and aliases
 */
export const ROOM_CONFIGS: {
  canonicalName: string;
  shortName: string;
  aliases: string[];
}[] = [
  {
    canonicalName: "Kletshok 03",
    shortName: "KH 03",
    aliases: [
      "kletshok 03",
      "kletshok 3",
      "03 kletshok",
      "3 kletshok",
      "kletshok03",
      "kletshok3",
      "03",
      "3",
      "kh 03",
      "kh 3",
      "kh03",
      "kh3",
      "kletskubus 03",
      "kletskubus 3",
      "klets hok 03",
      "klets hok 3",
    ],
  },
  {
    canonicalName: "Kletshok 04",
    shortName: "KH 04",
    aliases: [
      "kletshok 04",
      "kletshok 4",
      "04 kletshok",
      "4 kletshok",
      "kletshok04",
      "kletshok4",
      "04",
      "4",
      "kh 04",
      "kh 4",
      "kh04",
      "kh4",
      "kletskubus 04",
      "kletskubus 4",
      "klets hok 04",
      "klets hok 4",
    ],
  },
  {
    canonicalName: "Kletshok 05",
    shortName: "KH 05",
    aliases: [
      "kletshok 05",
      "kletshok 5",
      "05 kletshok",
      "5 kletshok",
      "kletshok05",
      "kletshok5",
      "05",
      "5",
      "kh 05",
      "kh 5",
      "kh05",
      "kh5",
      "kletskubus 05",
      "kletskubus 5",
      "klets hok 05",
      "klets hok 5",
    ],
  },
  {
    canonicalName: "Stilteruimte",
    shortName: "Stilteruimte",
    aliases: [
      "stilteruimte",
      "stilteruimte 02",
      "stilteruimte 2",
      "02 stilteruimte",
      "2 stilteruimte",
      "stilte ruimte 02",
      "stilte ruimte 2",
      "02 stilte ruimte",
      "2 stilte ruimte",
    ],
  },
  {
    canonicalName: "Tuinkamer",
    shortName: "TK",
    aliases: [
      "tuinkamer",
      "tuinkamer 06",
      "tuinkamer 6",
      "06 tuinkamer",
      "6 tuinkamer",
      "tuinkamer06",
      "tuinkamer6",
      "tuin kamer",
      "tuin kamer 06",
      "tuin kamer 6",
      "06 tuin kamer",
      "6 tuin kamer",
    ],
  },
  {
    canonicalName: "Vergaderruimte C3",
    shortName: "VG C3",
    aliases: [
      "vergaderruimte c3",
      "c3 vergaderruimte",
      "vergader c3",
      "c3 vergader",
    ],
  },
] as const;

/**
 * Create Room instances from configuration
 */
export function createRooms(): Room[] {
  return [
    ...ROOM_CONFIGS.map(
      (config) =>
        new Room(config.canonicalName, config.shortName, config.aliases),
    ),
    UNKNOWN_ROOM_INSTANCE,
  ];
}

/**
 * Pre-computed Room instances
 */
export const ROOMS: Room[] = createRooms();

/**
 * Get all canonical room names (excluding Unknown)
 */
export const CANONICAL_ROOMS = ROOM_CONFIGS.map((config) =>
  config.canonicalName
) as readonly string[];

/**
 * Create a mapping from lowercase alias to Room instance
 * This is used for fast lookup during parsing
 */
export function createRoomAliasMap(rooms: Room[]): Map<string, Room> {
  const aliasMap = new Map<string, Room>();

  for (const room of rooms) {
    // Add canonical name (lowercase)
    aliasMap.set(room.canonicalName.toLowerCase(), room);

    // Add short name (lowercase)
    aliasMap.set(room.shortName.toLowerCase(), room);

    // Add all aliases (lowercase)
    for (const alias of room.aliases) {
      aliasMap.set(alias.toLowerCase().trim(), room);
    }
  }

  return aliasMap;
}

/**
 * Pre-computed room alias map for fast lookups
 */
export const ROOM_ALIAS_MAP = createRoomAliasMap(ROOMS);

/**
 * Words and patterns to exclude from booker extraction
 */
export const BOOKER_EXCLUSIONS = [
  "unit",
  "nyma",
  "makersplaats",
  "team",
  "streek",
  "bakker",
  "info",
  "test",
  "workshop",
  "cursus",
  "vergader",
  "ruimte",
  "kletshok",
  "kletskubus",
  "stilteruimte",
  "stilte",
  "ruimte",
  "tuinkamer",
  "c3",
  "kh",
  "brn",
  "ev",
  "wt",
] as const;

/**
 * Get a room by its canonical name
 */
export function getRoomByCanonicalName(canonicalName: string): Room | null {
  for (const room of ROOMS) {
    if (room.canonicalName === canonicalName) {
      return room;
    }
  }
  return null;
}

/**
 * Get a room by any of its identifiers (canonical name, short name, or alias)
 */
export function getRoomByIdentifier(identifier: string): Room | null {
  const normalized = identifier.toLowerCase().trim();
  return ROOM_ALIAS_MAP.get(normalized) || null;
}
