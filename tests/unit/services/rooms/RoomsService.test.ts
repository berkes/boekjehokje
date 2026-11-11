/**
 * Unit tests for the rooms service
 *
 * Tests the public interface of the rooms module (RoomsPort): the catalog
 * contents, normalization of names and aliases, and finding room mentions
 * in free text.
 */
import { assert, assertEquals } from "@std/assert";
import { RoomsService } from "../../../../src/services/rooms/index.ts";
import { UNKNOWN_ROOM } from "../../../../src/services/rooms/index.ts";

function makeService() {
  return new RoomsService();
}

Deno.test("the catalog has rooms and includes the Unknown room last", () => {
  const rooms = makeService().all();

  assert(rooms.length > 1, "Should have more than one room");
  assertEquals(rooms[rooms.length - 1].canonicalName, UNKNOWN_ROOM);
  assertEquals(makeService().unknown().canonicalName, UNKNOWN_ROOM);
});

Deno.test("Room definitions have correct structure", () => {
  for (const room of makeService().all()) {
    assert(
      "canonicalName" in room && typeof room.canonicalName === "string",
      "Room should have canonicalName string",
    );
    assert(
      "shortName" in room && typeof room.shortName === "string",
      "Room should have shortName string",
    );
    assert(
      "aliases" in room && Array.isArray(room.aliases),
      "Room should have aliases array",
    );
    for (const alias of room.aliases) {
      assert(typeof alias === "string", "All aliases should be strings");
    }
  }
});

Deno.test("bookable rooms exclude the Unknown room", () => {
  const service = makeService();

  assertEquals(
    service.bookable().map((room) => room.canonicalName),
    service.all().map((room) => room.canonicalName).filter((name) =>
      name !== UNKNOWN_ROOM
    ),
  );
});

Deno.test("normalize maps canonical names, short names and aliases", () => {
  const service = makeService();

  assertEquals(service.normalize("Kletshok 05"), "Kletshok 05");
  assertEquals(service.normalize("kh5"), "Kletshok 05");
  assertEquals(service.normalize("05 KH"), "Kletshok 05");
  assertEquals(service.normalize("Kletskubus 05"), "Kletshok 05");
  assertEquals(service.normalize("stilteruimte"), "Stilteruimte");
  assertEquals(service.normalize("tuin kamer"), "Tuinkamer");
  assertEquals(service.normalize("VG C3"), "Vergaderruimte C3");
  assertEquals(service.normalize("iets anders"), UNKNOWN_ROOM);
  assertEquals(service.normalize("  03 KH  "), "Kletshok 03");
});

Deno.test("findMention finds the first room mention in a text", () => {
  const service = makeService();

  const mention = service.findMention("05 kletshok - Peter");
  assert(mention, "should find the room mention");
  assertEquals(mention.room.canonicalName, "Kletshok 05");
  assertEquals(
    "05 kletshok - Peter".substring(mention.begin, mention.end),
    "05 kletshok",
  );

  assertEquals(service.findMention(""), null);
  assertEquals(service.findMention("geen ruimte hier"), null);
});

Deno.test("Workshopruimte is no longer a known room", () => {
  const service = makeService();

  assert(
    !service.all().some((room) => room.canonicalName === "Workshopruimte C3"),
    "No room should match the workshop identifiers",
  );
  assertEquals(service.normalize("workshop c3"), UNKNOWN_ROOM);
  assertEquals(service.normalize("workshopruimte c3"), UNKNOWN_ROOM);
});
