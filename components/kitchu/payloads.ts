import { convertToBase, effectiveToBaseFactor, globalConversionFactor } from "@/lib/conversions";
import type { IngredientDraft, IngredientRecord, RecipeDraft, UnitDraft, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";
import { canDefineIngredientSpecificRatio, usableUnitsForIngredient } from "@/components/kitchu/unit-helpers";

function draftAsIngredientRecord(draft: IngredientDraft, units: UnitRecord[]): IngredientRecord {
  const baseUnit = units.find((unit) => unit.id === draft.baseUnitId)!;
  return {
    id: draft.id ?? "",
    name: draft.name,
    imageUrl: draft.imageUrl || null,
    notes: draft.notes || null,
    baseUnitId: draft.baseUnitId,
    baseUnit,
    units: draft.units
      .filter((row) => row.unitId)
      .map((row) => ({
        id: row.key,
        unitId: row.unitId,
        toBaseFactor: row.toBaseFactor ? Number(row.toBaseFactor) : null,
        unit: units.find((unit) => unit.id === row.unitId)!,
      })),
    products: [],
    stock: null,
  };
}

function stockQuantityInBase(draft: IngredientDraft, units: UnitRecord[], globalRatios: UnitRatioRecord[]) {
  if (!draft.stockQuantity.trim()) return null;

  const ingredientLike = draftAsIngredientRecord(draft, units);
  const allowedUnit = usableUnitsForIngredient(ingredientLike, units, globalRatios).find(
    (unit) => unit.unitId === draft.stockUnitId,
  );
  const baseQuantity = convertToBase(
    Number(draft.stockQuantity),
    effectiveToBaseFactor(allowedUnit?.unit, ingredientLike.baseUnit, allowedUnit?.toBaseFactor, globalRatios, {
      allowSpecific: true,
      units,
    }),
  );
  if (baseQuantity === null) {
    throw new Error("Unité de stock invalide.");
  }
  return baseQuantity;
}

export function toRecipePayload(draft: RecipeDraft) {
  return {
    id: draft.id,
    name: draft.name,
    imageUrl: draft.imageUrl,
    description: draft.description,
    sourceUrl: draft.sourceUrl,
    prepMinutes: draft.prepMinutes ? Number(draft.prepMinutes) : null,
    cookMinutes: draft.cookMinutes ? Number(draft.cookMinutes) : null,
    ingredients: draft.ingredients
      .filter((item) => item.ingredientId && item.unitId)
      .map((item) => ({
        ingredientId: item.ingredientId,
        unitId: item.unitId,
        quantityPerServing: Number(item.quantityPerServing),
        note: item.note,
      })),
    steps: draft.steps
      .filter((step) => step.instruction.trim())
      .map((step) => ({ instruction: step.instruction })),
  };
}

export function toIngredientPayload(draft: IngredientDraft, units: UnitRecord[], globalRatios: UnitRatioRecord[]) {
  const baseUnit = units.find((unit) => unit.id === draft.baseUnitId);
  const payloadUnits = new Map<string, { unitId: string; toBaseFactor: string | null }>();
  if (draft.baseUnitId) {
    payloadUnits.set(draft.baseUnitId, { unitId: draft.baseUnitId, toBaseFactor: null });
  }
  for (const unit of draft.units) {
    const unitRecord = units.find((item) => item.id === unit.unitId);
    if (!canDefineIngredientSpecificRatio(unitRecord, baseUnit, globalRatios, units)) continue;
    payloadUnits.set(unit.unitId, { unitId: unit.unitId, toBaseFactor: unit.toBaseFactor });
  }
  return {
    id: draft.id,
    name: draft.name,
    imageUrl: draft.imageUrl,
    notes: draft.notes,
    baseUnitId: draft.baseUnitId,
    stockQuantity: stockQuantityInBase(draft, units, globalRatios),
    units: Array.from(payloadUnits.values()),
    products: draft.products
      .filter((product) => product.store || product.name)
      .map((product) => ({
        id: product.id,
        store: product.store,
        brand: product.brand,
        name: product.name,
        imageUrl: product.imageUrl,
        packageQuantity: Number(product.packageQuantity),
        packageUnitId: product.packageUnitId,
        packageToBaseFactor:
          globalConversionFactor(units.find((item) => item.id === product.packageUnitId), baseUnit, globalRatios, units) !== null
            ? null
            : product.packageToBaseFactor,
        price: Number(product.price),
        url: product.url,
        barcode: product.barcode,
        notes: product.notes,
      })),
  };
}

export function toUnitPayload(draft: UnitDraft) {
  return {
    id: draft.id,
    code: draft.code,
    name: draft.name,
    symbol: draft.symbol,
    kind: draft.kind,
  };
}
