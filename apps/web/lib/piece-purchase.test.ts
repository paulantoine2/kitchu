import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPieceSizeWarning,
  optimizePiecePurchase,
  pieceProductOptions,
} from "@/lib/piece-purchase";
import type { IngredientRecord, UnitRecord } from "@/components/kitchu/types";

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

const bread: IngredientRecord = {
  id: "ing-bread",
  name: "Pain de mie",
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
      toBaseFactor: 50,
      unit: piece,
    },
  ],
  products: [
    {
      id: "prod-bread-slice",
      store: "Test",
      brand: null,
      name: "Tranche pain 40 g",
      imageUrl: null,
      storageType: "DRY",
      stockQuantity: null,
      packageQuantity: 1,
      packageUnitId: piece.id,
      packageToBaseFactor: 40,
      price: 0.25,
      url: null,
      barcode: null,
      notes: null,
      caloriesPer100g: null,
      proteinPer100g: null,
      carbsPer100g: null,
      fatPer100g: null,
      packageUnit: piece,
    },
  ],
  stock: null,
};

describe("piece purchase", () => {
  it("buys whole pieces instead of fractional weight", () => {
    const options = pieceProductOptions(
      bread.products.map((product) => ({
        product,
        packageBaseQuantity: 40,
        unitPrice: 0.25 / 40,
      })),
      bread,
      [],
      [gram, piece],
    );

    const plan = optimizePiecePurchase(2, options, 100);
    assert.ok(plan);
    assert.equal(plan?.items[0]?.count, 2);
    assert.equal(plan?.totalBaseQuantity, 80);
    assert.equal(plan?.totalPrice, 0.5);
    assert.equal(plan?.leftover, 0);
  });

  it("buys one piece when recipe needs one lighter slice", () => {
    const options = pieceProductOptions(
      bread.products.map((product) => ({
        product,
        packageBaseQuantity: 40,
        unitPrice: 0.25 / 40,
      })),
      bread,
      [],
      [gram, piece],
    );

    const plan = optimizePiecePurchase(1, options, 50);
    assert.ok(plan);
    assert.equal(plan?.items[0]?.count, 1);
    assert.equal(plan?.totalBaseQuantity, 40);
    assert.equal(plan?.leftover, 0);
  });

  it("reports leftover when product piece is heavier than recipe piece", () => {
    const heavierBread: IngredientRecord = {
      ...bread,
      products: [
        {
          ...bread.products[0]!,
          id: "prod-bread-heavy",
          name: "Tranche pain 60 g",
          packageToBaseFactor: 60,
        },
      ],
    };

    const options = pieceProductOptions(
      heavierBread.products.map((product) => ({
        product,
        packageBaseQuantity: 60,
        unitPrice: 0.3 / 60,
      })),
      heavierBread,
      [],
      [gram, piece],
    );

    const plan = optimizePiecePurchase(1, options, 50);
    assert.ok(plan);
    assert.equal(plan?.items[0]?.count, 1);
    assert.equal(plan?.totalBaseQuantity, 60);
    assert.equal(plan?.leftover, 10);
  });

  it("builds warnings when piece sizes differ", () => {
    assert.match(
      buildPieceSizeWarning(50, 40, "g") ?? "",
      /plus petite/i,
    );
    assert.match(
      buildPieceSizeWarning(50, 60, "g") ?? "",
      /plus grande/i,
    );
    assert.equal(buildPieceSizeWarning(50, 50, "g"), null);
  });

  it("buys one multipack when it contains enough pieces", () => {
    const packBread: IngredientRecord = {
      ...bread,
      products: [
        {
          ...bread.products[0]!,
          id: "prod-bread-pack",
          name: "Pack 2 tranches 40 g",
          packageQuantity: 2,
          price: 1,
        },
      ],
    };

    const options = pieceProductOptions(
      packBread.products.map((product) => ({
        product,
        packageBaseQuantity: 80,
        unitPrice: 1 / 80,
      })),
      packBread,
      [],
      [gram, piece],
    );

    const plan = optimizePiecePurchase(2, options, 100);
    assert.ok(plan);
    assert.equal(plan?.items[0]?.count, 1);
    assert.equal(plan?.totalPrice, 1);
    assert.equal(plan?.totalBaseQuantity, 80);
  });
});
