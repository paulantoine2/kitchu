import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ingredientUnitToBaseFactor, recipeLineToBaseFactor } from "./unit-helpers";
import type { IngredientRecord, UnitRecord } from "./types";

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

const tomato: IngredientRecord = {
  id: "ing-tomato",
  name: "Tomate",
  imageUrl: null,
  notes: null,
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

describe("recipeLineToBaseFactor", () => {
  it("uses the ingredient average when no recipe override is set", () => {
    assert.equal(
      recipeLineToBaseFactor(tomato, piece, piece.id, null, [], [gram, piece]),
      150,
    );
    assert.equal(ingredientUnitToBaseFactor(tomato, piece.id), 150);
  });

  it("uses the recipe override when provided", () => {
    assert.equal(
      recipeLineToBaseFactor(tomato, piece, piece.id, 250, [], [gram, piece]),
      250,
    );
  });
});
