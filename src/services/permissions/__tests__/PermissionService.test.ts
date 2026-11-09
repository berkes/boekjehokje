/**
 * Unit tests for the permission service
 *
 * The service is tested through its public interface (PermissionServicePort)
 * with the central FakeAuthenticationService from src/testing, so the
 * "current user" is set directly. The ownership rule is ADR-0004; its
 * interaction with the calendar service is covered by the integration
 * tests in tests/integration.
 */

import { assert, assertEquals } from "@std/assert";
import {
  FakeAuthenticationService,
  fakeSession,
  fakeUser,
} from "../../../testing/index.ts";
import { PermissionService } from "../PermissionService.ts";

function bookingBy(author: string) {
  return { details: { author } };
}

function makeService(authentication: FakeAuthenticationService) {
  return new PermissionService({ authentication });
}

Deno.test('may("create") is true when authenticated, false when signed out', () => {
  const signedIn = makeService(new FakeAuthenticationService(fakeSession()));
  const signedOut = makeService(new FakeAuthenticationService(null));

  assertEquals(signedIn.may("create"), true);
  assertEquals(signedOut.may("create"), false);
});

Deno.test("may update/delete a booking created by the current user's email", () => {
  const service = makeService(new FakeAuthenticationService(fakeSession()));

  assert(
    service.may("update", bookingBy("ber@boekjehokje.test")),
    "own booking",
  );
  assert(
    service.may("delete", bookingBy("ber@boekjehokje.test")),
    "own booking",
  );
});

Deno.test("email comparison is case-insensitive and trims whitespace", () => {
  const service = makeService(
    new FakeAuthenticationService(
      fakeSession({ ...fakeUser, email: "BER@boekjehokje.test" }),
    ),
  );

  assert(service.may("update", bookingBy(" ber@BOEKJEHOKJE.test ")));
});

Deno.test("may not update/delete a booking created by someone else", () => {
  const service = makeService(new FakeAuthenticationService(fakeSession()));

  assert(!service.may("update", bookingBy("sanne@example.com")));
  assert(!service.may("delete", bookingBy("onbekend")));
});

Deno.test("nothing is editable when signed out", () => {
  const service = makeService(new FakeAuthenticationService(null));

  assert(!service.may("update", bookingBy("ber@boekjehokje.test")));
  assert(!service.may("delete", bookingBy("ber@boekjehokje.test")));
});
