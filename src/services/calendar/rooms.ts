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
export class RoomConfig {
  readonly canonicalName: string;
  readonly shortName: string;
  readonly aliases: string[];

  constructor(canonicalName: string, shortName: string, aliases: string[]) {
    this.canonicalName = canonicalName;
    this.shortName = shortName;
    this.aliases = aliases;
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
 * The special Unknown room instance for events that couldn't be matched
 */
const UNKNOWN_ROOM_CONFIG: RoomConfig = new RoomConfig(
  UNKNOWN_ROOM,
  UNKNOWN_ROOM,
  [],
);

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
      "kh 03",
      "kh 3",
      "kh03",
      "kh3",
      "03 kletskubus",
      "3 kletskubus",
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
      "kh 04",
      "kh 4",
      "kh04",
      "kh4",
      "04 kletskubus",
      "4 kletskubus",
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
      "kh 05",
      "kh 5",
      "kh05",
      "kh5",
      "05 kletskubus",
      "5 kletskubus",
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
  ...ROOM_CONFIGS.map(
    ({ canonicalName, shortName, aliases }) =>
      new RoomConfig(canonicalName, shortName, aliases),
  ),
  UNKNOWN_ROOM_CONFIG,
];
