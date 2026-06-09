import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addOrUpdateCartItem,
  buildUsageShares,
  computeCartPurchases,
  normalizeUsageShares,
  removeCartItem,
} from "@/components/kitchu/cart";
import { estimatePurchaseTotal, estimateRecipeViewCosts } from "@/components/kitchu/recipe-cost";
import type { IngredientRecord, RecipeRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";

const gram: UnitRecord = {
  id: "u-g",
  code: "g",
  name: "Gramme",
  symbol: "g",
  kind: "MASS",
  globalBaseUnitId: null,
  globalToBaseFactor: null,
};

const kilogram: UnitRecord = {
  id: "u-kg",
  code: "kg",
  name: "Kilogramme",
  symbol: "kg",
  kind: "MASS",
  globalBaseUnitId: "u-g",
  globalToBaseFactor: 1000,
};

const butter: IngredientRecord = {
  id: "ing-butter",
  name: "Beurre",
  imageUrl: null,
  notes: null,
  baseUnitId: gram.id,
  baseUnit: gram,
  units: [],
  products: [
    {
      id: "prod-butter-200g",
      store: "Test",
      brand: null,
      name: "Beurre 200 g",
      imageUrl: null,
      storageType: "FRESH",
      stockQuantity: null,
      packageQuantity: 200,
      packageUnitId: gram.id,
      packageToBaseFactor: 1,
      price: 2,
      url: null,
      barcode: null,
      notes: null,
      packageUnit: gram,
    },
  ],
  stock: null,
};

const flour: IngredientRecord = {
  id: "ing-flour",
  name: "Farine",
  imageUrl: null,
  notes: null,
  baseUnitId: gram.id,
  baseUnit: gram,
  units: [],
  products: [
    {
      id: "prod-flour-1kg",
      store: "Test",
      brand: null,
      name: "Farine 1 kg",
      imageUrl: null,
      storageType: "DRY",
      stockQuantity: null,
      packageQuantity: 1,
      packageUnitId: kilogram.id,
      packageToBaseFactor: null,
      price: 1.5,
      url: null,
      barcode: null,
      notes: null,
      packageUnit: kilogram,
    },
  ],
  stock: null,
};

function recipe(
  id: string,
  name: string,
  quantityPerServing: number,
  ingredient: IngredientRecord = flour,
): RecipeRecord {
  return {
    id,
    name,
    imageUrl: null,
    description: null,
    sourceUrl: null,
    prepMinutes: null,
    cookMinutes: null,
    ingredients: [
      {
        id: `${id}-ing`,
        ingredientId: ingredient.id,
        unitId: gram.id,
        quantityPerServing,
        note: null,
        position: 0,
        ingredient,
        unit: gram,
      },
    ],
    steps: [],
  };
}

describe("cart coverage", () => {
  it("adds, updates and removes cart entries", () => {
    let items = addOrUpdateCartItem([], "recipe-a", 2);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.portions, 2);

    items = addOrUpdateCartItem(items, "recipe-a", 4);
    assert.equal(items.length, 1);
    assert.equal(items[0]?.portions, 4);

    items = removeCartItem(items, "recipe-a");
    assert.equal(items.length, 0);
  });

  it("shares leftovers across recipes for the same ingredient", () => {
    const recipeA = recipe("recipe-a", "Recette A", 400);
    const recipeB = recipe("recipe-b", "Recette B", 500);
    const summary = computeCartPurchases(
      [
        { recipeId: recipeA.id, portions: 1 },
        { recipeId: recipeB.id, portions: 1 },
      ],
      [recipeA, recipeB],
      [flour],
      [] satisfies UnitRatioRecord[],
      [gram, kilogram],
      new Map(),
      false,
    );

    assert.equal(summary.productLines.length, 1);
    const line = summary.productLines[0];
    assert.equal(line?.count, 1);
    assert.equal(line?.totalBaseQuantity, 1000);
    assert.equal(line?.totalPrice, 1.5);

    const usageByRecipe = new Map(line?.usage.map((entry) => [entry.recipeName, entry.percent]));
    assert.equal(usageByRecipe.get("Recette A"), 40);
    assert.equal(usageByRecipe.get("Recette B"), 50);
    assert.equal(line?.leftoverPercent, 10);
    assert.ok(Math.abs((summary.leftoverValue.total ?? 0) - 0.15) < 0.000001);
    assert.ok(Math.abs((summary.recipeLines.find((entry) => entry.recipeId === recipeA.id)?.usedMerchandiseValue ?? 0) - 0.6) < 0.000001);
    assert.ok(Math.abs((summary.recipeLines.find((entry) => entry.recipeId === recipeB.id)?.usedMerchandiseValue ?? 0) - 0.75) < 0.000001);
  });

  it("bases usage proportions on purchased quantity after stock deduction", () => {
    const recipeA = recipe("recipe-a", "Recette A", 150, butter);
    const stock = new Map([[butter.id, 100]]);

    const summary = computeCartPurchases(
      [{ recipeId: recipeA.id, portions: 1 }],
      [recipeA],
      [butter],
      [] satisfies UnitRatioRecord[],
      [gram],
      stock,
      true,
    );

    assert.equal(summary.productLines.length, 1);
    const line = summary.productLines[0];
    assert.equal(line?.totalBaseQuantity, 200);
    assert.equal(line?.usage[0]?.percent, 25);
    assert.equal(line?.leftoverPercent, 75);
    assert.equal(summary.totalPrice.total, 2);
    assert.equal(summary.leftoverValue.total, 1.5);
    assert.equal(summary.recipeLines[0]?.usedMerchandiseValue, 1.5);
  });

  it("uses stock before purchasing and recalculates on portion changes", () => {
    const recipeA = recipe("recipe-a", "Recette A", 300);
    const stock = new Map([[flour.id, 500]]);

    const initial = computeCartPurchases(
      [{ recipeId: recipeA.id, portions: 1 }],
      [recipeA],
      [flour],
      [],
      [gram, kilogram],
      stock,
      true,
    );
    assert.equal(initial.productLines.length, 0);

    const updated = computeCartPurchases(
      [{ recipeId: recipeA.id, portions: 3 }],
      [recipeA],
      [flour],
      [],
      [gram, kilogram],
      stock,
      true,
    );
    assert.equal(updated.productLines.length, 1);
    assert.equal(updated.productLines[0]?.totalBaseQuantity, 1000);
    assert.equal(updated.productLines[0]?.usage[0]?.percent, 40);
    assert.equal(updated.productLines[0]?.leftoverPercent, 60);
  });

  it("normalizes usage shares to 100%", () => {
    const normalized = normalizeUsageShares(
      [
        { recipeId: "a", recipeName: "Recette A", percent: 33.3 },
        { recipeId: "b", recipeName: "Recette B", percent: 33.3 },
      ],
      33.4,
    );

    const total =
      normalized.usage.reduce((sum, entry) => sum + entry.percent, 0) + normalized.leftoverPercent;
    assert.equal(total, 100);
  });

  it("builds usage shares from remaining needs", () => {
    const { usage, leftoverPercent } = buildUsageShares(
      [
        { recipeId: "a", recipeName: "Recette A", requiredBaseQuantity: 400 },
        { recipeId: "b", recipeName: "Recette B", requiredBaseQuantity: 500 },
      ],
      new Map([
        ["a", 400],
        ["b", 500],
      ]),
      1000,
      100,
    );

    assert.equal(usage.find((entry) => entry.recipeId === "a")?.percent, 40);
    assert.equal(usage.find((entry) => entry.recipeId === "b")?.percent, 50);
    assert.equal(leftoverPercent, 10);
  });

  it("deducts cart leftovers when estimating a recipe not yet in the cart", () => {
    const recipeA = recipe("recipe-a", "Recette A", 150, butter);
    const recipeB = recipe("recipe-b", "Recette B", 40, butter);
    const cartItems = [{ recipeId: recipeA.id, portions: 1 }];

    const estimates = estimateRecipeViewCosts({
      recipe: recipeB,
      portions: 1,
      ingredients: [butter],
      globalRatios: [],
      units: [gram],
      stockByIngredientId: new Map(),
      cartItems,
      isInCart: false,
      applyStock: true,
      recipes: [recipeA, recipeB],
    });

    const estimate = estimates.find((entry) => entry.ingredientId === butter.id);
    assert.equal(estimate?.cartLeftoverAvailable, 50);
    assert.equal(estimate?.cartLeftoverUsed, 40);
    assert.equal(estimate?.toPurchaseBaseQuantity, 0);
    assert.equal(estimatePurchaseTotal(estimate!), 0);
    assert.ok(Math.abs((estimate?.theoreticalPrice ?? 0) - 0.4) < 0.000001);
  });

  it("keeps theoretical price independent of stock and cart leftovers", () => {
    const recipeA = recipe("recipe-a", "Recette A", 150, butter);
    const recipeB = recipe("recipe-b", "Recette B", 40, butter);
    const cartItems = [{ recipeId: recipeA.id, portions: 1 }];
    const stock = new Map([[butter.id, 100]]);

    const withInventory = estimateRecipeViewCosts({
      recipe: recipeB,
      portions: 1,
      ingredients: [butter],
      globalRatios: [],
      units: [gram],
      stockByIngredientId: stock,
      cartItems,
      isInCart: false,
      applyStock: true,
      recipes: [recipeA, recipeB],
    });
    const withoutInventory = estimateRecipeViewCosts({
      recipe: recipeB,
      portions: 1,
      ingredients: [butter],
      globalRatios: [],
      units: [gram],
      stockByIngredientId: new Map(),
      cartItems: [],
      isInCart: false,
      applyStock: false,
      recipes: [recipeA, recipeB],
    });

    const covered = withInventory.find((entry) => entry.ingredientId === butter.id);
    const full = withoutInventory.find((entry) => entry.ingredientId === butter.id);
    assert.equal(estimatePurchaseTotal(covered!), 0);
    assert.ok(Math.abs((covered?.theoreticalPrice ?? 0) - 0.4) < 0.000001);
    assert.ok(Math.abs((full?.theoreticalPrice ?? 0) - 0.4) < 0.000001);
  });

  it("matches cart merchandise value for a recipe already in the cart", () => {
    const recipeA = recipe("recipe-a", "Recette A", 400);
    const recipeB = recipe("recipe-b", "Recette B", 500);
    const cartItems = [
      { recipeId: recipeA.id, portions: 1 },
      { recipeId: recipeB.id, portions: 1 },
    ];
    const summary = computeCartPurchases(
      cartItems,
      [recipeA, recipeB],
      [flour],
      [],
      [gram, kilogram],
      new Map(),
      true,
    );

    for (const cartRecipe of [recipeA, recipeB]) {
      const estimates = estimateRecipeViewCosts({
        recipe: cartRecipe,
        portions: 1,
        ingredients: [flour],
        globalRatios: [],
        units: [gram, kilogram],
        stockByIngredientId: new Map(),
        cartItems,
        isInCart: true,
        applyStock: true,
        recipes: [recipeA, recipeB],
      });
      const purchaseTotal = estimates.reduce(
        (sum, estimate) => sum + (estimatePurchaseTotal(estimate) ?? 0),
        0,
      );
      const cartValue =
        summary.recipeLines.find((entry) => entry.recipeId === cartRecipe.id)?.usedMerchandiseValue ?? 0;
      assert.ok(Math.abs(purchaseTotal - cartValue) < 0.000001);
    }
  });

  it("ignores stock and cart when applyStock is false", () => {
    const recipeA = recipe("recipe-a", "Recette A", 150, butter);
    const recipeB = recipe("recipe-b", "Recette B", 40, butter);
    const cartItems = [
      { recipeId: recipeA.id, portions: 1 },
      { recipeId: recipeB.id, portions: 1 },
    ];
    const stock = new Map([[butter.id, 100]]);

    const notInCart = estimateRecipeViewCosts({
      recipe: recipeB,
      portions: 1,
      ingredients: [butter],
      globalRatios: [],
      units: [gram],
      stockByIngredientId: stock,
      cartItems,
      isInCart: false,
      applyStock: false,
      recipes: [recipeA, recipeB],
    });
    const notInCartEstimate = notInCart.find((entry) => entry.ingredientId === butter.id);
    assert.equal(notInCartEstimate?.stockUsed, 0);
    assert.equal(notInCartEstimate?.cartLeftoverUsed, 0);
    assert.equal(notInCartEstimate?.toPurchaseBaseQuantity, 40);
    assert.equal(notInCartEstimate?.purchasePlan?.totalPrice, 2);

    const inCart = estimateRecipeViewCosts({
      recipe: recipeA,
      portions: 1,
      ingredients: [butter],
      globalRatios: [],
      units: [gram],
      stockByIngredientId: stock,
      cartItems,
      isInCart: true,
      applyStock: false,
      recipes: [recipeA, recipeB],
    });
    const inCartEstimate = inCart.find((entry) => entry.ingredientId === butter.id);
    assert.equal(inCartEstimate?.stockUsed, 0);
    assert.equal(inCartEstimate?.cartLeftoverUsed, 0);
    assert.equal(inCartEstimate?.toPurchaseBaseQuantity, 150);
    assert.equal(inCartEstimate?.purchasePlan?.totalPrice, 2);
  });

  it("recomputes in-cart estimate when portions change on the recipe view", () => {
    const recipeA = recipe("recipe-a", "Recette A", 300);
    const cartItems = [{ recipeId: recipeA.id, portions: 1 }];
    const stock = new Map([[flour.id, 500]]);

    const atOnePortion = estimateRecipeViewCosts({
      recipe: recipeA,
      portions: 1,
      ingredients: [flour],
      globalRatios: [],
      units: [gram, kilogram],
      stockByIngredientId: stock,
      cartItems,
      isInCart: true,
      applyStock: true,
      recipes: [recipeA],
    });
    assert.equal(atOnePortion[0]?.toPurchaseBaseQuantity, 0);

    const atThreePortions = estimateRecipeViewCosts({
      recipe: recipeA,
      portions: 3,
      ingredients: [flour],
      globalRatios: [],
      units: [gram, kilogram],
      stockByIngredientId: stock,
      cartItems,
      isInCart: true,
      applyStock: true,
      recipes: [recipeA],
    });
    assert.equal(atThreePortions[0]?.toPurchaseBaseQuantity, 400);
    assert.ok(Math.abs((estimatePurchaseTotal(atThreePortions[0]!) ?? 0) - 0.6) < 0.000001);
  });
});
