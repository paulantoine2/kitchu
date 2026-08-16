import assert from "node:assert/strict";
import test from "node:test";
import type { RecipeRecord } from "@kitchu/domain";
import { assertOnline, canAccessAdmin, filterAndSortRecipes } from "./mobile-rules";

function recipe(id: string, name: string, ingredientName: string): RecipeRecord {
  return {
    id,
    name,
    description: null,
    imageUrl: null,
    sourceUrl: null,
    servings: 2,
    prepMinutes: null,
    cookMinutes: null,
    ingredients: [{
      id: `${id}-line`,
      quantityPerServing: 1,
      ingredient: { id: `${id}-ingredient`, name: ingredientName, stock: null, products: [] },
    }],
    steps: [],
  } as unknown as RecipeRecord;
}

test("recipe search matches recipe and ingredient names", () => {
  const recipes = [recipe("1", "Curry vert", "Coriandre"), recipe("2", "Soupe", "Carotte")];
  assert.deepEqual(filterAndSortRecipes(recipes, "coriandre", "recent").map(({ id }) => id), ["1"]);
  assert.deepEqual(filterAndSortRecipes(recipes, "soupe", "recent").map(({ id }) => id), ["2"]);
});

test("recipe name sorting is locale aware", () => {
  const recipes = [recipe("1", "Ziti", "Pâtes"), recipe("2", "À la grecque", "Tomate")];
  assert.deepEqual(filterAndSortRecipes(recipes, "", "name").map(({ id }) => id), ["2", "1"]);
});

test("admin and offline guards fail closed", () => {
  assert.equal(canAccessAdmin("ADMIN"), true);
  assert.equal(canAccessAdmin("USER"), false);
  assert.equal(canAccessAdmin(undefined), false);
  assert.throws(() => assertOnline(false), /connexion est nécessaire/);
  assert.doesNotThrow(() => assertOnline(true));
});
