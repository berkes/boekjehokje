/**
 * Room configuration - internal module
 *
 * Contains room aliases and canonical room names.
 * This is an internal implementation detail, not part of the public API.
 */

/**
 * Canonical room names - the single source of truth for room identities
 */
export const CANONICAL_ROOMS = [
  "Kletshok 03",
  "Kletshok 04",
  "Kletshok 05",
  "Stilteruimte",
  "Tuinkamer 06",
  "Vergaderruimte C3",
  "Workshopruimte C3",
] as const;

/**
 * Special room name for events that couldn't be parsed
 */
export const UNKNOWN_ROOM = "Unknown" as const;

/**
 * Type for all possible room names
 */
export type RoomName = typeof CANONICAL_ROOMS[number] | typeof UNKNOWN_ROOM;

/**
 * Room aliases mapping: lowercase alias -> canonical room name
 *
 * This is the core normalization mechanism.
 * When we encounter a room reference in an event summary, we look it up here
 * to find its canonical name.
 */
export const ROOM_ALIASES: Record<string, RoomName> = {
  // Kletshok 03 aliases
  "kletshok 03": "Kletshok 03",
  "03 kletshok": "Kletshok 03",
  "kletshok3": "Kletshok 03",
  "03": "Kletshok 03",
  "3": "Kletshok 03",
  "kh 03": "Kletshok 03",
  "kh3": "Kletshok 03",
  "kletskubus 03": "Kletshok 03",
  "kletskubus 3": "Kletshok 03",

  // Kletshok 04 aliases
  "kletshok 04": "Kletshok 04",
  "04 kletshok": "Kletshok 04",
  "kletshok4": "Kletshok 04",
  "04": "Kletshok 04",
  "4": "Kletshok 04",
  "kh 04": "Kletshok 04",
  "kh4": "Kletshok 04",
  "kletskubus 04": "Kletshok 04",
  "kletskubus 4": "Kletshok 04",

  // Kletshok 05 aliases
  "kletshok 05": "Kletshok 05",
  "05 kletshok": "Kletshok 05",
  "kletshok5": "Kletshok 05",
  "05": "Kletshok 05",
  "5": "Kletshok 05",
  "kh 05": "Kletshok 05",
  "kh5": "Kletshok 05",
  "kletskubus 05": "Kletshok 05",
  "kletskubus 5": "Kletshok 05",

  // Stilteruimte
  "stilteruimte": "Stilteruimte",
  "stilteruimte 02": "Stilteruimte",
  "stilteruimte 2": "Stilteruimte",

  // Tuinkamer 06 aliases
  "tuinkamer 06": "Tuinkamer 06",
  "06 tuinkamer": "Tuinkamer 06",
  "tuinkamer6": "Tuinkamer 06",
  "tuinkamer": "Tuinkamer 06",

  // Vergaderruimte C3 aliases
  "vergaderruimte c3": "Vergaderruimte C3",
  "c3 vergaderruimte": "Vergaderruimte C3",
  "vergader c3": "Vergaderruimte C3",
  "c3": "Vergaderruimte C3",

  // Workshopruimte C3 aliases
  "workshopruimte c3": "Workshopruimte C3",
  "c3 workshopruimte": "Workshopruimte C3",
  "workshop c3": "Workshopruimte C3",
} as const;

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
  "tuinkamer",
  "c3",
  "kh",
  "brn",
  "ev",
  "wt",
] as const;
