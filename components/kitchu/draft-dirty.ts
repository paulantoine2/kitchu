import type { IngredientDraft, RecipeDraft, UnitDraft } from "@/components/kitchu/types";

function fingerprint(value: unknown): string {
  return JSON.stringify(value);
}

function recipeFingerprint(draft: RecipeDraft) {
  return {
    name: draft.name,
    imageUrl: draft.imageUrl,
    description: draft.description,
    sourceUrl: draft.sourceUrl,
    prepMinutes: draft.prepMinutes,
    cookMinutes: draft.cookMinutes,
    ingredients: draft.ingredients.map((item) => ({
      ingredientId: item.ingredientId,
      unitId: item.unitId,
      quantityPerServing: item.quantityPerServing,
      unitToBaseFactor: item.unitToBaseFactor,
      preparationWeightRatio: item.preparationWeightRatio,
      note: item.note,
    })),
    steps: draft.steps.map((step) => step.instruction),
  };
}

function ingredientFingerprint(draft: IngredientDraft) {
  return {
    name: draft.name,
    imageUrl: draft.imageUrl,
    notes: draft.notes,
    preparationWeightRatio: draft.preparationWeightRatio,
    baseUnitId: draft.baseUnitId,
    units: draft.units.map((unit) => ({
      unitId: unit.unitId,
      toBaseFactor: unit.toBaseFactor,
    })),
    products: draft.products.map((product) => ({
      store: product.store,
      brand: product.brand,
      name: product.name,
      imageUrl: product.imageUrl,
      storageType: product.storageType,
      stockQuantity: product.stockQuantity,
      packageQuantity: product.packageQuantity,
      packageUnitId: product.packageUnitId,
      packageToBaseFactor: product.packageToBaseFactor,
      price: product.price,
      url: product.url,
      barcode: product.barcode,
      notes: product.notes,
    })),
  };
}

function unitFingerprint(draft: UnitDraft) {
  return {
    code: draft.code,
    name: draft.name,
    symbol: draft.symbol,
    kind: draft.kind,
  };
}

export function isRecipeDraftDirty(current: RecipeDraft, baseline: RecipeDraft): boolean {
  return fingerprint(recipeFingerprint(current)) !== fingerprint(recipeFingerprint(baseline));
}

export function isIngredientDraftDirty(current: IngredientDraft, baseline: IngredientDraft): boolean {
  return fingerprint(ingredientFingerprint(current)) !== fingerprint(ingredientFingerprint(baseline));
}

export function isUnitDraftDirty(current: UnitDraft, baseline: UnitDraft): boolean {
  return fingerprint(unitFingerprint(current)) !== fingerprint(unitFingerprint(baseline));
}
