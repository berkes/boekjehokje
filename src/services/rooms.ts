/**
 * Room configuration for the calendar service
 *
 * The static configuration of the rooms of the NYMA Makersplaats:
 * canonical names, short names and aliases. The domain Room and Booking
 * types live in CalendarServicePort.ts; this module only describes the
 * rooms themselves.
 */

/**
 * The configuration of one room
 */
export interface RoomConfig {
  canonicalName: string;
  shortName: string;
  aliases: string[];
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
export const UNKNOWN_ROOM_CONFIG: RoomConfig = {
  canonicalName: UNKNOWN_ROOM,
  shortName: UNKNOWN_ROOM,
  aliases: [],
};

/**
 * All defined rooms with their canonical names, short names, and aliases
 */
const ROOM_CONFIGS: {
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
 * All rooms, the Unknown room included
 */
export const ROOMS: RoomConfig[] = [
  ...ROOM_CONFIGS.map((config) => ({
    canonicalName: config.canonicalName,
    shortName: config.shortName,
    aliases: [...config.aliases],
  })),
  UNKNOWN_ROOM_CONFIG,
];

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
export function createRoomAliasMap(
  rooms: RoomConfig[],
): Map<string, RoomConfig> {
  const aliasMap = new Map<string, RoomConfig>();

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
export function getRoomByCanonicalName(
  canonicalName: string,
): RoomConfig | null {
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
export function getRoomByIdentifier(identifier: string): RoomConfig | null {
  const normalized = identifier.toLowerCase().trim();
  return ROOM_ALIAS_MAP.get(normalized) || null;
}
