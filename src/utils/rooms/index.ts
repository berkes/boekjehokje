/**
 * Rooms module - public API
 *
 * Provides room parsing and normalization functionality.
 * Exports only what is needed by other modules.
 */

import { CANONICAL_ROOMS, UNKNOWN_ROOM } from "./config.ts";
import { parseAndGroupEvents, type ParsedEvent } from "./parser.ts";
import type { RoomName } from "./config.ts";

// Re-export types
export type { ParsedEvent, RoomName };

// Export only the public API
export { UNKNOWN_ROOM };
export { parseAndGroupEvents };
export { CANONICAL_ROOMS as getCanonicalRooms };
