/**
 * Unit tests for the room column visibility helpers
 *
 * The pure helpers of the useRoomVisibility hook: toggling a room in the
 * hidden set and filtering rooms down to the visible ones.
 */
import { assertEquals } from "@std/assert";
import {
  toggleHiddenRoom,
  visibleRooms,
} from "../../../src/hooks/roomVisibility.ts";

function room(canonicalName: string) {
  return { canonicalName, shortName: canonicalName, bookings: [] };
}

Deno.test("toggleHiddenRoom adds a room that is not hidden", () => {
  assertEquals(
    toggleHiddenRoom(new Set(), "Kletshok 05"),
    new Set(["Kletshok 05"]),
  );
});

Deno.test("toggleHiddenRoom removes a hidden room", () => {
  assertEquals(
    toggleHiddenRoom(new Set(["Kletshok 05"]), "Kletshok 05"),
    new Set(),
  );
});

Deno.test("toggleHiddenRoom leaves other rooms untouched", () => {
  assertEquals(
    toggleHiddenRoom(new Set(["Kletshok 03"]), "Kletshok 05"),
    new Set(["Kletshok 03", "Kletshok 05"]),
  );
});

Deno.test("visibleRooms filters out hidden rooms", () => {
  const rooms = [room("Kletshok 03"), room("Kletshok 04")];
  assertEquals(visibleRooms(rooms, new Set(["Kletshok 03"])), [
    room("Kletshok 04"),
  ]);
});

Deno.test("visibleRooms shows all rooms when nothing is hidden", () => {
  const rooms = [room("Kletshok 03"), room("Kletshok 04")];
  assertEquals(visibleRooms(rooms, new Set()), rooms);
});

Deno.test("visibleRooms allows hiding every room", () => {
  const rooms = [room("Kletshok 03"), room("Kletshok 04")];
  assertEquals(
    visibleRooms(rooms, new Set(["Kletshok 03", "Kletshok 04"])),
    [],
  );
});

Deno.test("visibleRooms ignores hidden rooms that no longer exist", () => {
  const rooms = [room("Kletshok 03")];
  assertEquals(visibleRooms(rooms, new Set(["Kletshok 09"])), rooms);
});
