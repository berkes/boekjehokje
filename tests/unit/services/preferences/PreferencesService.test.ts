/**
 * Unit tests for the preferences service
 *
 * The preferences (last-used booker contact, hidden room columns) are user
 * preferences, stored through the injected key-value store repository
 * (never business data). Tests use the central in-memory fake from
 * tests/utils and never touch real localStorage.
 */
import { assert, assertEquals } from "@std/assert";
import { InMemoryKeyValueStore } from "../../../utils/index.ts";
import type { KeyValueStorePort } from "../../../../src/services/preferences/KeyValueStorePort.ts";
import { PreferencesService } from "../../../../src/services/preferences/PreferencesService.ts";

function makeService(store: KeyValueStorePort = new InMemoryKeyValueStore()) {
  return { service: new PreferencesService({ store }), store };
}

Deno.test("getBookerContact returns an empty contact when nothing is stored", () => {
  assertEquals(makeService().service.getBookerContact(), "");
});

Deno.test("saveBookerContact persists the contact and getBookerContact reads it back", () => {
  const { service } = makeService();

  service.saveBookerContact("ber@boekjehokje.test");

  assertEquals(service.getBookerContact(), "ber@boekjehokje.test");
});

Deno.test("getBookerContact returns an empty contact for invalid stored data", () => {
  const store = new InMemoryKeyValueStore();
  store.write("boekjehokje_booker_contact", "{not json");
  const { service } = makeService(store);

  assertEquals(service.getBookerContact(), "");
});

Deno.test("getBookerContact returns an empty contact for a non-string value", () => {
  const store = new InMemoryKeyValueStore();
  store.write("boekjehokje_booker_contact", JSON.stringify(42));
  const { service } = makeService(store);

  assertEquals(service.getBookerContact(), "");
});

Deno.test("getHiddenRooms returns an empty set when nothing is stored", () => {
  assertEquals(makeService().service.getHiddenRooms(), new Set());
});

Deno.test("getHiddenRooms returns the stored room ids", () => {
  const store = new InMemoryKeyValueStore();
  store.write(
    "boekjehokje_hidden_rooms",
    '["Kletshok 03","Kletshok 04"]',
  );
  const { service } = makeService(store);

  assertEquals(
    service.getHiddenRooms(),
    new Set(["Kletshok 03", "Kletshok 04"]),
  );
});

Deno.test("getHiddenRooms returns an empty set for invalid JSON", () => {
  const store = new InMemoryKeyValueStore();
  store.write("boekjehokje_hidden_rooms", "[not json");
  const { service } = makeService(store);

  assertEquals(service.getHiddenRooms(), new Set());
});

Deno.test("getHiddenRooms returns an empty set for a non-array value", () => {
  const store = new InMemoryKeyValueStore();
  store.write("boekjehokje_hidden_rooms", '"Kletshok 03"');
  const { service } = makeService(store);

  assertEquals(service.getHiddenRooms(), new Set());
});

Deno.test("getHiddenRooms ignores non-string entries", () => {
  const store = new InMemoryKeyValueStore();
  store.write("boekjehokje_hidden_rooms", '["Kletshok 03",5,null]');
  const { service } = makeService(store);

  assertEquals(service.getHiddenRooms(), new Set(["Kletshok 03"]));
});

Deno.test("saveHiddenRooms stores the hidden rooms as JSON", () => {
  const store = new InMemoryKeyValueStore();
  const { service } = makeService(store);

  service.saveHiddenRooms(new Set(["Kletshok 03"]));

  assertEquals(
    store.read("boekjehokje_hidden_rooms"),
    '["Kletshok 03"]',
  );
});

Deno.test("saveHiddenRooms round-trips through getHiddenRooms", () => {
  const { service } = makeService();
  const hidden = new Set(["Kletshok 03", "Kletshok 05"]);

  service.saveHiddenRooms(hidden);

  assertEquals(service.getHiddenRooms(), hidden);
});

Deno.test("the service does not throw when the store fails", () => {
  const failing: KeyValueStorePort = {
    read: () => {
      throw new Error("storage broken");
    },
    write: () => {
      throw new Error("quota exceeded");
    },
  };
  const { service } = makeService(failing);

  try {
    service.saveBookerContact("ber@boekjehokje.test");
    service.saveHiddenRooms(new Set(["Kletshok 03"]));
    assertEquals(service.getBookerContact(), "");
    assertEquals(service.getHiddenRooms(), new Set());
  } catch {
    assert(false, "preference operations should not throw");
  }
});
