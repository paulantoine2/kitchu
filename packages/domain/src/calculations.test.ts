import assert from "node:assert/strict";
import test from "node:test";
import { addOrUpdateCartItem, removeCartItem } from "./calculations";

test("cart entries are normalized and removable", () => {
  const added = addOrUpdateCartItem([], "recipe-1", 0);
  assert.deepEqual(added, [{ recipeId: "recipe-1", portions: 1 }]);
  assert.deepEqual(removeCartItem(added, "recipe-1"), []);
});
