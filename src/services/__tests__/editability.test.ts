/**
 * Unit tests for the editability predicate
 *
 * Editability is decided by comparing the booking's creator email
 * (details.author) with the authenticated user's profile email.
 */
import { assert, assertFalse } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import type { Booking } from "../rooms.ts";
import { isEditable, isEditableBy } from "../editability.ts";

function booking(overrides: Partial<Booking>): Booking {
  return {
    id: "id-1",
    uid: "uid-1",
    summary: "Kletshok 05 - Bèr",
    room: "Kletshok 05",
    booker: "Bèr",
    details: {
      originalName: "Kletshok 05 - Bèr",
      author: "ber@example.com",
    },
    start: new Date(2026, 1, 19, 10, 0, 0),
    end: new Date(2026, 1, 19, 11, 0, 0),
    ...overrides,
  };
}

describe("isEditable", () => {
  it("is editable when creator email matches the profile email", () => {
    assert(
      isEditable(booking({}), { email: "ber@example.com" }),
    );
  });

  it("is not editable when creator email differs", () => {
    assertFalse(
      isEditable(booking({}), { email: "other@example.com" }),
    );
  });

  it("compares emails case-insensitively", () => {
    assert(
      isEditable(booking({}), { email: "BER@example.com" }),
    );
    const upperAuthor = booking({
      details: { originalName: "x", author: "Ber@Example.com" },
    });
    assert(isEditable(upperAuthor, { email: "ber@example.com" }));
  });

  it("ignores surrounding whitespace in emails", () => {
    assert(
      isEditable(booking({}), { email: " ber@example.com " }),
    );
  });

  it("is not editable without an authenticated profile", () => {
    assertFalse(isEditable(booking({}), null));
    assertFalse(isEditable(booking({}), undefined));
  });

  it("is not editable when the profile has an empty email", () => {
    assertFalse(isEditable(booking({}), { email: "" }));
  });

  it("is not editable when authenticated in Google but no email came back", () => {
    const profileWithoutEmail = JSON.parse('{"email": null}');
    assertFalse(isEditable(booking({}), profileWithoutEmail));
  });

  it("is not editable when the booking has no creator email", () => {
    const unknownAuthor = booking({
      details: { originalName: "x", author: "onbekend" },
    });
    assertFalse(isEditable(unknownAuthor, { email: "onbekend@example.com" }));
    assertFalse(isEditable(unknownAuthor, null));
  });
});

describe("isEditableBy", () => {
  it("accepts minimal shapes with only details.author", () => {
    assert(
      isEditableBy(
        { details: { author: "ber@example.com" } },
        { email: "ber@example.com" },
      ),
    );
  });
});
