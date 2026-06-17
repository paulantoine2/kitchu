import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  effectiveMacroProfile,
  estimateRecipeMacrosPerServing,
  formatMacroProfilePer100gSummary,
  formatRecipeMacrosSummary,
  hasMacroProfile,
} from "./recipe-macros";
import type { IngredientRecord, RecipeRecord, UnitRecord } from "./types";

const gram: UnitRecord = {
  id: "u-g",
  code: "g",
  name: "Gramme",
  symbol: "g",
  kind: "MASS",
  globalBaseUnitId: null,
  globalToBaseFactor: null,
};

const chicken: IngredientRecord = {
  id: "ing-chicken",
  name: "Poulet",
  imageUrl: null,
  notes: null,
  preparationWeightRatio: null,
  caloriesPer100g: 165,
  proteinPer100g: 31,
  carbsPer100g: 0,
  fatPer100g: 3.6,
  baseUnitId: gram.id,
  baseUnit: gram,
  units: [],
  products: [
    {
      id: "prod-chicken",
      store: "Leclerc",
      brand: null,
      name: "Filet de poulet",
      imageUrl: null,
      storageType: "FRESH",
      stockQuantity: null,
      packageQuantity: 500,
      packageUnitId: gram.id,
      packageToBaseFactor: null,
      price: 6,
      url: null,
      barcode: null,
      notes: null,
      caloriesPer100g: 120,
      proteinPer100g: 26,
      carbsPer100g: null,
      fatPer100g: 2,
      packageUnit: gram,
    },
  ],
  stock: null,
};

const rice: IngredientRecord = {
  id: "ing-rice",
  name: "Riz",
  imageUrl: null,
  notes: null,
  preparationWeightRatio: null,
  caloriesPer100g: 360,
  proteinPer100g: 7,
  carbsPer100g: 79,
  fatPer100g: 1,
  baseUnitId: gram.id,
  baseUnit: gram,
  units: [],
  products: [],
  stock: null,
};

function recipeLine(
  ingredient: IngredientRecord,
  quantityPerServing: number,
  position: number,
): RecipeRecord["ingredients"][number] {
  return {
    id: `line-${position}`,
    ingredientId: ingredient.id,
    unitId: gram.id,
    quantityPerServing,
    unitToBaseFactor: null,
    preparationWeightRatio: null,
    note: null,
    position,
    ingredient,
    unit: gram,
  };
}

describe("effectiveMacroProfile", () => {
  it("uses product overrides when set", () => {
    const profile = effectiveMacroProfile(chicken, chicken.products[0]);
    assert.equal(profile.caloriesPer100g, 120);
    assert.equal(profile.proteinPer100g, 26);
    assert.equal(profile.carbsPer100g, 0);
    assert.equal(profile.fatPer100g, 2);
  });

  it("falls back to ingredient values", () => {
    const profile = effectiveMacroProfile(rice, null);
    assert.equal(profile.caloriesPer100g, 360);
    assert.equal(hasMacroProfile(profile), true);
  });
});

describe("estimateRecipeMacrosPerServing", () => {
  it("sums macros from ingredient quantities", () => {
    const estimate = estimateRecipeMacrosPerServing(
      {
        ingredients: [recipeLine(chicken, 200, 0), recipeLine(rice, 100, 1)],
      },
      [],
      [gram],
    );

    assert.ok(estimate.perServing);
    assert.equal(estimate.isComplete, true);
    assert.equal(estimate.perServing.calories, 600);
    assert.equal(estimate.perServing.protein, 59);
    assert.equal(estimate.perServing.carbs, 79);
    assert.equal(estimate.perServing.fat, 5);
  });

  it("uses cheapest product macro overrides", () => {
    const estimate = estimateRecipeMacrosPerServing(
      { ingredients: [recipeLine(chicken, 100, 0)] },
      [],
      [gram],
    );

    assert.ok(estimate.perServing);
    assert.equal(estimate.perServing.calories, 120);
    assert.equal(estimate.perServing.protein, 26);
    assert.equal(estimate.perServing.fat, 2);
  });

  it("ignores preparation weight ratio", () => {
    const peeledOnion: IngredientRecord = {
      ...rice,
      id: "ing-onion",
      name: "Oignon",
      preparationWeightRatio: 0.7,
      caloriesPer100g: 40,
      proteinPer100g: 1.1,
      carbsPer100g: 9.3,
      fatPer100g: 0.1,
    };

    const estimate = estimateRecipeMacrosPerServing(
      {
        ingredients: [
          {
            ...recipeLine(peeledOnion, 200, 0),
            preparationWeightRatio: 0.5,
          },
        ],
      },
      [],
      [gram],
    );

    assert.ok(estimate.perServing);
    assert.equal(estimate.perServing.calories, 80);
    assert.equal(estimate.perServing.protein, 2.2);
    assert.equal(estimate.perServing.carbs, 18.6);
    assert.equal(estimate.lines[0]?.grams, 200);
  });

  it("marks missing macro data as incomplete", () => {
    const tomato: IngredientRecord = {
      ...rice,
      id: "ing-tomato",
      name: "Tomate",
      caloriesPer100g: null,
      proteinPer100g: null,
      carbsPer100g: null,
      fatPer100g: null,
    };

    const estimate = estimateRecipeMacrosPerServing(
      { ingredients: [recipeLine(rice, 100, 0), recipeLine(tomato, 50, 1)] },
      [],
      [gram],
    );

    assert.ok(estimate.perServing);
    assert.equal(estimate.isComplete, false);
    assert.deepEqual(estimate.missingIngredientNames, ["Tomate"]);
  });
});

describe("formatRecipeMacrosSummary", () => {
  it("formats calories and macros", () => {
    const summary = formatRecipeMacrosSummary({
      calories: 745,
      protein: 37,
      carbs: 72.3,
      fat: 33.2,
    });
    assert.equal(summary, "745 kcal · P 37 g · G 72,3 g · L 33,2 g");
  });
});

describe("formatMacroProfilePer100gSummary", () => {
  it("formats per-100g profile values", () => {
    const summary = formatMacroProfilePer100gSummary({
      caloriesPer100g: 165,
      proteinPer100g: 31,
      carbsPer100g: 0,
      fatPer100g: 3.6,
    });
    assert.equal(summary, "165 kcal · P 31 g · G 0 g · L 3,6 g");
  });

  it("returns null when profile is empty", () => {
    assert.equal(
      formatMacroProfilePer100gSummary({
        caloriesPer100g: null,
        proteinPer100g: null,
        carbsPer100g: null,
        fatPer100g: null,
      }),
      null,
    );
  });
});
