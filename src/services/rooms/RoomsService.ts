/**
 * Rooms service
 *
 * The room catalog of the NYMA Makersplaats: the static configuration of
 * the rooms (canonical names, short names, aliases) lives here, private to
 * this module; the port (RoomsPort) is the only public interface.
 */

import {
  type RoomDefinition,
  type RoomMention,
  type RoomsPort,
  UNKNOWN_ROOM,
} from "./RoomsPort.ts";

const ROOM_CONFIGS: RoomDefinition[] = [
  {
    canonicalName: "Kletshok 03",
    shortName: "03 KH",
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
    shortName: "04 KH",
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
    shortName: "05 KH",
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
 * The special Unknown room definition
 */
const UNKNOWN_ROOM_DEFINITION: RoomDefinition = {
  canonicalName: UNKNOWN_ROOM,
  shortName: UNKNOWN_ROOM,
  aliases: [],
};

/**
 * Rooms service: the catalog behind the RoomsPort
 */
export class RoomsService implements RoomsPort {
  private rooms: RoomDefinition[];

  constructor() {
    this.rooms = [...ROOM_CONFIGS, UNKNOWN_ROOM_DEFINITION];
  }

  /** All rooms, the Unknown room included and last */
  all(): RoomDefinition[] {
    return [...this.rooms];
  }

  /** The bookable rooms: all except the Unknown room */
  bookable(): RoomDefinition[] {
    return this.rooms.filter((room) => room.canonicalName !== UNKNOWN_ROOM);
  }

  /** The special Unknown room */
  unknown(): RoomDefinition {
    return UNKNOWN_ROOM_DEFINITION;
  }

  /**
   * The canonical name for a room name, short name or alias
   * (case-insensitive), or UNKNOWN_ROOM when nothing matches
   */
  normalize(name: string): string {
    const lowerName = name.toLowerCase().trim();

    for (const room of this.rooms) {
      if (
        room.canonicalName.toLowerCase() === lowerName ||
        room.shortName.toLowerCase() === lowerName ||
        room.aliases.some((alias) => alias.toLowerCase() === lowerName)
      ) {
        return room.canonicalName;
      }
    }

    return UNKNOWN_ROOM;
  }

  /**
   * The first room mention in the given text: canonical name first, then
   * short name, then aliases (case-insensitive), or null when the text
   * mentions no room
   */
  findMention(text: string): RoomMention | null {
    if (text.length <= 0) return null;

    const lowered = text.toLowerCase();
    for (const room of this.rooms) {
      let index = lowered.indexOf(room.canonicalName.toLowerCase());
      if (index >= 0) {
        return { begin: index, end: index + room.canonicalName.length, room };
      }

      index = lowered.indexOf(room.shortName.toLowerCase());
      if (index >= 0) {
        return { begin: index, end: index + room.shortName.length, room };
      }

      for (const alias of room.aliases) {
        index = lowered.indexOf(alias.toLowerCase());
        if (index >= 0) {
          return { begin: index, end: index + alias.length, room };
        }
      }
    }

    return null;
  }
}
