import assert from "node:assert/strict";
import test from "node:test";
import {
  canMutatePrivateProduct,
  isProductVisibleToUser,
  matchesConfiguredAdminEmail,
  resolvePersonalProductState,
} from "./multi-user";

test("a shared product is public while a private product is isolated to its owner", () => {
  assert.equal(isProductVisibleToUser(null, null), true);
  assert.equal(isProductVisibleToUser(null, "user-b"), true);
  assert.equal(isProductVisibleToUser("user-a", "user-a"), true);
  assert.equal(isProductVisibleToUser("user-a", "user-b"), false);
  assert.equal(isProductVisibleToUser("user-a", null), false);
});

test("only the owner can mutate a private product", () => {
  assert.equal(canMutatePrivateProduct("user-a", "user-a"), true);
  assert.equal(canMutatePrivateProduct("user-a", "user-b"), false);
  assert.equal(canMutatePrivateProduct(null, "user-a"), false);
  assert.equal(canMutatePrivateProduct("user-a", null), false);
});

test("personal price and stock override only the current user's effective values", () => {
  assert.deepEqual(resolvePersonalProductState(3.5, null), {
    catalogPrice: 3.5,
    price: 3.5,
    priceOverride: null,
    stockQuantity: null,
  });
  assert.deepEqual(
    resolvePersonalProductState(3.5, { priceOverride: 2.9, stockQuantity: 4 }),
    { catalogPrice: 3.5, price: 2.9, priceOverride: 2.9, stockQuantity: 4 },
  );
});

test("admin promotion requires the configured verified email", () => {
  assert.equal(matchesConfiguredAdminEmail("Admin@Example.com", true, " admin@example.com "), true);
  assert.equal(matchesConfiguredAdminEmail("admin@example.com", false, "admin@example.com"), false);
  assert.equal(matchesConfiguredAdminEmail("other@example.com", true, "admin@example.com"), false);
  assert.equal(matchesConfiguredAdminEmail("admin@example.com", true, undefined), false);
});
