/**
 * Unit tests for the booker contact preference
 *
 * The last-used contact of the booking form is a user preference, stored
 * in localStorage (never business data). Storage is injected, so the
 * tests use an in-memory fake and never touch real localStorage.
 */
import { assertEquals } from "@std/assert";
import {
  loadBookerContact,
  type PreferenceStorage,
  saveBookerContact,
} from "../bookerContact.ts";

function memoryStorage(
  initial: Record<string, string> = {},
): PreferenceStorage & { data: Record<string, string> } {
  const data: Record<string, string> = { ...initial };
  return {
    data,
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value;
    },
  };
}

Deno.test("loadBookerContact returns an empty contact when nothing is stored", () => {
  assertEquals(loadBookerContact(memoryStorage()), "");
});

Deno.test("saveBookerContact persists the contact and loadBookerContact reads it back", () => {
  const storage = memoryStorage();

  saveBookerContact("ber@boekjehokje.test", storage);

  assertEquals(loadBookerContact(storage), "ber@boekjehokje.test");
});

Deno.test("loadBookerContact returns an empty contact for invalid stored data", () => {
  const storage = memoryStorage({ boekjehokje_booker_contact: "{not json" });

  assertEquals(loadBookerContact(storage), "");
});

Deno.test("loadBookerContact returns an empty contact for a non-string value", () => {
  const storage = memoryStorage({
    boekjehokje_booker_contact: JSON.stringify(42),
  });

  assertEquals(loadBookerContact(storage), "");
});
