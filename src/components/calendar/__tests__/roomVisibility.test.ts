/**
 * Unit tests for room column visibility persistence and helpers
 *
 * Storage is injected as a fake, so no browser environment is needed.
 */
import { assert, assertEquals } from "@std/assert";
import {
  loadHiddenRooms,
  type RoomVisibilityStorage,
  saveHiddenRooms,
  toggleHiddenRoom,
  visibleRooms,
} from "../roomVisibility.ts";
import type { CalendarRoom } from "../utils.tsx";

class FakeStorage implements RoomVisibilityStorage {
  private items = new Map<string, string>();

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
}

function room(canonicalName: string): CalendarRoom {
  return { canonicalName, shortName: canonicalName, bookings: [] };
}

Deno.test("toggleHiddenRoom adds a room that is not hidden", () => {
  assertEquals(
    toggleHiddenRoom(new Set(), "Kletshok 05"),
    new Set([
      "Kletshok 05",
    ]),
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

Deno.test("loadHiddenRooms returns an empty set when nothing is stored", () => {
  assertEquals(loadHiddenRooms(new FakeStorage()), new Set());
});

Deno.test("loadHiddenRooms returns the stored room ids", () => {
  const storage = new FakeStorage();
  storage.setItem(
    "boekjehokje_hidden_rooms",
    '["Kletshok 03","Kletshok 04"]',
  );
  assertEquals(
    loadHiddenRooms(storage),
    new Set(["Kletshok 03", "Kletshok 04"]),
  );
});

Deno.test("loadHiddenRooms returns an empty set for invalid JSON", () => {
  const storage = new FakeStorage();
  storage.setItem("boekjehokje_hidden_rooms", "[not json");
  assertEquals(loadHiddenRooms(storage), new Set());
});

Deno.test("loadHiddenRooms returns an empty set for a non-array value", () => {
  const storage = new FakeStorage();
  storage.setItem("boekjehokje_hidden_rooms", '"Kletshok 03"');
  assertEquals(loadHiddenRooms(storage), new Set());
});

Deno.test("loadHiddenRooms ignores non-string entries", () => {
  const storage = new FakeStorage();
  storage.setItem("boekjehokje_hidden_rooms", '["Kletshok 03",5,null]');
  assertEquals(loadHiddenRooms(storage), new Set(["Kletshok 03"]));
});

Deno.test("saveHiddenRooms stores the hidden rooms as JSON", () => {
  const storage = new FakeStorage();
  saveHiddenRooms(new Set(["Kletshok 03"]), storage);
  assertEquals(
    storage.getItem("boekjehokje_hidden_rooms"),
    '["Kletshok 03"]',
  );
});

Deno.test("saveHiddenRooms round-trips through loadHiddenRooms", () => {
  const storage = new FakeStorage();
  const hidden = new Set(["Kletshok 03", "Kletshok 05"]);
  saveHiddenRooms(hidden, storage);
  assertEquals(loadHiddenRooms(storage), hidden);
});

Deno.test("saveHiddenRooms does not throw when storage fails", () => {
  const failing: RoomVisibilityStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("quota exceeded");
    },
  };
  const hidden = new Set(["Kletshok 03"]);
  try {
    saveHiddenRooms(hidden, failing);
  } catch (_error) {
    assert(false, "saveHiddenRooms should swallow storage errors");
  }
});
