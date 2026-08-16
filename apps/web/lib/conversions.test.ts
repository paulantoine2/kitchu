import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  convertToBase,
  effectiveToBaseFactor,
  globalConversionFactor,
  pricePerBaseUnit,
  scaleQuantity,
} from "./conversions";

describe("ingredient conversions", () => {
  it("converts ingredient-specific units into the ingredient base unit", () => {
    assert.equal(convertToBase(2, 150), 300);
    assert.equal(convertToBase(0.5, 1000), 500);
  });

  it("returns null when a ratio is missing or invalid", () => {
    assert.equal(convertToBase(1, null), null);
    assert.equal(convertToBase(1, 0), null);
  });

  it("uses hardcoded immutable ratios between standard units", () => {
    const gram = { id: "u-g", code: "g" };
    const kilogram = { id: "u-kg", code: "kg" };
    const millilitre = { id: "u-ml", code: "ml" };
    const centilitre = { id: "u-cl", code: "cl" };
    const litre = { id: "u-l", code: "l" };
    const spoon = { id: "u-cas", code: "cas" };
    const ratios = [
      { fromUnitId: "u-cas", toUnitId: "u-kg", factor: 0.015 },
    ];
    const units = [gram, kilogram, millilitre, centilitre, litre, spoon];

    assert.equal(globalConversionFactor(kilogram, gram, ratios, units), 1000);
    assert.equal(globalConversionFactor(gram, kilogram, ratios, units), 0.001);
    assert.equal(globalConversionFactor(litre, millilitre, ratios, units), 1000);
    assert.equal(globalConversionFactor(litre, centilitre, ratios, units), 100);
    assert.equal(globalConversionFactor(centilitre, litre, ratios, units), 0.01);
    assert.equal(globalConversionFactor(spoon, gram, ratios, units), 15);
  });

  it("uses ingredient-specific ratios only when explicitly allowed", () => {
    const gram = { id: "g" };
    const piece = { id: "piece" };

    assert.equal(effectiveToBaseFactor(piece, gram, 180), null);
    assert.equal(effectiveToBaseFactor(piece, gram, 180, [], { allowSpecific: true }), 180);
    assert.equal(effectiveToBaseFactor(piece, gram, null), null);
  });

  it("computes product price per base unit", () => {
    assert.ok(Math.abs((pricePerBaseUnit(11.9, 1, 1000) ?? 0) - 0.0119) < 0.000001);
    assert.ok(Math.abs((pricePerBaseUnit(1.29, 1, 265) ?? 0) - 0.0048679) < 0.000001);
  });

  it("scales per-serving quantities on the client side", () => {
    assert.equal(scaleQuantity(120, 4), 480);
  });
});
