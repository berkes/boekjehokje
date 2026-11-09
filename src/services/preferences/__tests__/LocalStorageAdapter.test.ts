/**
 * Unit tests for the local storage repository adapter
 *
 * The adapter stays dumb: it only stores what it is handed and propagates
 * storage failures (the preferences service decides they are
 * non-essential). Tests use the central in-memory browser storage fake
 * from src/testing.
 */
import { assertEquals, assertThrows } from "@std/assert";
import { InMemoryBrowserStorage } from "../../../testing/index.ts";
import { LocalStorageAdapter } from "../LocalStorageAdapter.ts";

Deno.test("write then read round-trips the value", () => {
  const storage = new InMemoryBrowserStorage();
  const adapter = new LocalStorageAdapter(storage);

  adapter.write("key", '"value"');

  assertEquals(adapter.read("key"), '"value"');
  assertEquals(storage.getItem("key"), '"value"');
});

Deno.test("read returns null for a missing key", () => {
  const adapter = new LocalStorageAdapter(new InMemoryBrowserStorage());

  assertEquals(adapter.read("missing"), null);
});

Deno.test("read and write propagate storage failures", () => {
  const failing = {
    getItem: () => {
      throw new Error("broken");
    },
    setItem: () => {
      throw new Error("quota exceeded");
    },
  };
  const adapter = new LocalStorageAdapter(failing);

  assertThrows(() => adapter.write("key", "value"), Error, "quota exceeded");
  assertThrows(() => adapter.read("key"), Error, "broken");
});
