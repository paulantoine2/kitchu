import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { effectivePreparationWeightRatio, estimateRecipeWeightPerServing } from "./recipe-weight";
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

const piece: UnitRecord = {
  id: "u-piece",
  code: "piece",
  name: "Pièce",
  symbol: "pièce",
  kind: "COUNT",
  globalBaseUnitId: null,
  globalToBaseFactor: null,
};

const pasta: IngredientRecord = {
  id: "ing-pasta",
  name: "Pâtes",
  imageUrl: null,
  notes: null,
  preparationWeightRatio: 2.25,
  caloriesPer100g: null,
  proteinPer100g: null,
  carbsPer100g: null,
  fatPer100g: null,
  baseUnitId: gram.id,
  baseUnit: gram,
  units: [],
  products: [],
  stock: null,
};

const tomato: IngredientRecord = {
  id: "ing-tomato",
  name: "Tomate",
  imageUrl: null,
  notes: null,
  preparationWeightRatio: null,
  caloriesPer100g: null,
  proteinPer100g: null,
  carbsPer100g: null,
  fatPer100g: null,
  baseUnitId: gram.id,
  baseUnit: gram,
  units: [
    {
      id: "iu-piece",
      unitId: piece.id,
      toBaseFactor: 150,
      unit: piece,
    },
  ],
  products: [],
  stock: null,
};

function recipeWithIngredients(
  ingredients: RecipeRecord["ingredients"],
): RecipeRecord {
  return {
    id: "recipe-1",
    name: "Test",
    imageUrl: null,
    description: null,
    sourceUrl: null,
    prepMinutes: null,
    cookMinutes: null,
    ingredients,
    steps: [],
  };
}

describe("effectivePreparationWeightRatio", () => {
  it("defaults to 1 when nothing is set", () => {
    assert.equal(effectivePreparationWeightRatio(null, null), 1);
  });

  it("uses the ingredient default when the recipe has no override", () => {
    assert.equal(effectivePreparationWeightRatio(2.25, null), 2.25);
  });

  it("prefers the recipe override", () => {
    assert.equal(effectivePreparationWeightRatio(2.25, 1.8), 1.8);
  });
});

describe("estimateRecipeWeightPerServing", () => {
  it("sums prepared mass for mass-based ingredients", () => {
    const estimate = estimateRecipeWeightPerServing(
      recipeWithIngredients([
        {
          id: "ri-1",
          ingredientId: pasta.id,
          unitId: gram.id,
          quantityPerServing: 100,
          unitToBaseFactor: null,
          preparationWeightRatio: null,
          note: null,
          position: 0,
          ingredient: pasta,
          unit: gram,
        },
        {
          id: "ri-2",
          ingredientId: tomato.id,
          unitId: piece.id,
          quantityPerServing: 2,
          unitToBaseFactor: null,
          preparationWeightRatio: null,
          note: null,
          position: 1,
          ingredient: tomato,
          unit: piece,
        },
      ]),
      [],
      [gram, piece],
    );

    assert.equal(estimate.gramsPerServing, 225 + 300);
    assert.equal(estimate.isComplete, true);
    assert.equal(estimate.lines.length, 2);
    assert.equal(estimate.lines[0]?.preparedGrams, 225);
    assert.equal(estimate.lines[1]?.preparedGrams, 300);
  });

  it("applies a recipe-level ratio override", () => {
    const estimate = estimateRecipeWeightPerServing(
      recipeWithIngredients([
        {
          id: "ri-1",
          ingredientId: pasta.id,
          unitId: gram.id,
          quantityPerServing: 100,
          unitToBaseFactor: null,
          preparationWeightRatio: 2,
          note: null,
          position: 0,
          ingredient: pasta,
          unit: gram,
        },
      ]),
      [],
      [gram],
    );

    assert.equal(estimate.gramsPerServing, 200);
  });

  it("ignores count-based ingredients", () => {
    const onion: IngredientRecord = {
      ...tomato,
      id: "ing-onion",
      name: "Oignon",
      baseUnitId: piece.id,
      baseUnit: piece,
      units: [],
    };

    const estimate = estimateRecipeWeightPerServing(
      recipeWithIngredients([
        {
          id: "ri-1",
          ingredientId: onion.id,
          unitId: piece.id,
          quantityPerServing: 1,
          unitToBaseFactor: null,
          preparationWeightRatio: null,
          note: null,
          position: 0,
          ingredient: onion,
          unit: piece,
        },
      ]),
      [],
      [gram, piece],
    );

    assert.equal(estimate.gramsPerServing, null);
    assert.equal(estimate.isComplete, true);
  });

  it("treats volume as mass with a 1 ml = 1 g approximation", () => {
    const millilitre: UnitRecord = {
      id: "u-ml",
      code: "ml",
      name: "Millilitre",
      symbol: "ml",
      kind: "VOLUME",
      globalBaseUnitId: null,
      globalToBaseFactor: null,
    };

    const litre: UnitRecord = {
      id: "u-l",
      code: "l",
      name: "Litre",
      symbol: "L",
      kind: "VOLUME",
      globalBaseUnitId: millilitre.id,
      globalToBaseFactor: 1000,
    };

    const cream: IngredientRecord = {
      id: "ing-cream",
      name: "Crème",
      imageUrl: null,
      notes: null,
      preparationWeightRatio: null,
      caloriesPer100g: null,
      proteinPer100g: null,
      carbsPer100g: null,
      fatPer100g: null,
      baseUnitId: millilitre.id,
      baseUnit: millilitre,
      units: [],
      products: [],
      stock: null,
    };

    const estimate = estimateRecipeWeightPerServing(
      recipeWithIngredients([
        {
          id: "ri-1",
          ingredientId: cream.id,
          unitId: millilitre.id,
          quantityPerServing: 200,
          unitToBaseFactor: null,
          preparationWeightRatio: null,
          note: null,
          position: 0,
          ingredient: cream,
          unit: millilitre,
        },
        {
          id: "ri-2",
          ingredientId: cream.id,
          unitId: litre.id,
          quantityPerServing: 0.5,
          unitToBaseFactor: null,
          preparationWeightRatio: null,
          note: null,
          position: 1,
          ingredient: cream,
          unit: litre,
        },
      ]),
      [],
      [gram, millilitre, litre],
    );

    assert.equal(estimate.gramsPerServing, 700);
    assert.equal(estimate.isComplete, true);
  });
});
