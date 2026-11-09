/**
 * Integration tests: authentication service + permission service
 *
 * Two real services (AuthenticationService and PermissionService) over the
 * central fakes: the permission service reads the current user from the
 * authentication service on every call, so login and logout are reflected
 * immediately. More than two services are covered by the E2E suite.
 */

import { assert, assertEquals } from "@std/assert";
import {
  FakeAuthenticationProvider,
  fakeTokens,
  fakeUser,
  InMemorySessionStorage,
} from "../../src/testing/index.ts";
import { AuthenticationService } from "../../src/services/authentication/AuthenticationService.ts";
import { PermissionService } from "../../src/services/permissions/PermissionService.ts";

/** Fixed point in time for deterministic expiry math */
const NOW = 1_730_000_000_000;

function makeTree(
  provider: FakeAuthenticationProvider = new FakeAuthenticationProvider(),
  storage: InMemorySessionStorage = new InMemorySessionStorage(),
) {
  const authentication = new AuthenticationService({
    provider,
    sessionStorage: storage,
    now: () => NOW,
  });
  const permissions = new PermissionService({ authentication });
  return { authentication, permissions, provider, storage };
}

function ownBooking() {
  return { details: { author: "ber@boekjehokje.test" } };
}

Deno.test("after login the user may create and edit their own bookings", async () => {
  const { authentication, permissions } = makeTree();

  await authentication.login();

  assertEquals(permissions.may("create"), true);
  assert(permissions.may("update", ownBooking()));
  assert(permissions.may("delete", ownBooking()));
});

Deno.test("after logout the user may do nothing", async () => {
  const { authentication, permissions } = makeTree();

  await authentication.login();
  authentication.logout();

  assertEquals(permissions.may("create"), false);
  assertEquals(permissions.may("update", ownBooking()), false);
  assertEquals(permissions.may("delete", ownBooking()), false);
});

Deno.test("an expired stored session counts as signed out", () => {
  const storage = new InMemorySessionStorage();
  storage.save({
    user: fakeUser,
    tokens: { ...fakeTokens(), expiresAt: NOW },
  });
  const { permissions } = makeTree(new FakeAuthenticationProvider(), storage);

  assertEquals(permissions.may("create"), false);
  assertEquals(permissions.may("update", ownBooking()), false);
});
