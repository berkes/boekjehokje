/**
 * Rooms port (input port of the rooms service)
 *
 * The room catalog of the NYMA Makersplaats in domain language: canonical
 * names, short names and aliases. The Unknown room collects events that
 * could not be matched to a room.
 */

/**
 * Special room name for events that couldn't be matched to a room
 */
export const UNKNOWN_ROOM = "Unknown" as const;

/**
 * Description shown for bookings that could not be matched to a room
 */
export const UNKNOWN_ROOM_DESCRIPTION =
  "Boekingen die we niet konden koppelen, bijvoorbeeld door een typefout";

/**
 * The definition of one room: canonical name, short name and aliases
 */
export interface RoomDefinition {
  canonicalName: string;
  shortName: string;
  aliases: string[];
}

/**
 * A room mention found in a text: the room plus the mention's span
 */
export interface RoomMention {
  begin: number;
  end: number;
  room: RoomDefinition;
}

/**
 * The port every rooms service must implement
 */
export interface RoomsPort {
  /** All rooms, the Unknown room included and last */
  all(): RoomDefinition[];
  /** The bookable rooms: all except the Unknown room */
  bookable(): RoomDefinition[];
  /** The special Unknown room */
  unknown(): RoomDefinition;
  /**
   * The canonical name for a room name, short name or alias
   * (case-insensitive), or UNKNOWN_ROOM when nothing matches
   */
  normalize(name: string): string;
  /**
   * The first room mention in the given text (canonical name, short name
   * or alias, case-insensitive), or null when the text mentions no room
   */
  findMention(text: string): RoomMention | null;
}
