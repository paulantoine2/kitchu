import { globalConversionFactor } from "@/lib/conversions";
import type { IngredientDraft, RecipeDraft, UnitDraft, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";
import { canDefineIngredientSpecificRatio } from "@/components/kitchu/unit-helpers";

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
