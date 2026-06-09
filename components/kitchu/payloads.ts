import { convertFromBase, convertToBase, effectiveToBaseFactor, globalConversionFactor } from "@/lib/conversions";
import { isProductStorageType, type ProductStorageType } from "@/lib/product-storage";
import type { IngredientDraft, IngredientRecord, RecipeDraft, UnitDraft, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";
import { canDefineIngredientSpecificRatio } from "@/components/kitchu/unit-helpers";

function normalizeStorageType(value: unknown): ProductStorageType {
  const candidate = typeof value === "string" ? value : "";
  return isProductStorageType(candidate) ? candidate : "FRESH";
}

function productPackageToBaseFactor(
  packageUnit: UnitRecord | undefined,
  baseUnit: UnitRecord | undefined,
  packageToBaseFactor: number | string | null | undefined,
  units: UnitRecord[],
  globalRatios: UnitRatioRecord[],
) {
  return effectiveToBaseFactor(packageUnit, baseUnit, packageToBaseFactor, globalRatios, {
    allowSpecific: true,
    units,
  });
}

export function productStockInPackageUnits(
  stockInBase: number | null,
  product: IngredientRecord["products"][number],
  baseUnit: UnitRecord,
  units: UnitRecord[],
  globalRatios: UnitRatioRecord[],
) {
  if (stockInBase == null || stockInBase <= 0) return "";
  const packageQuantity = convertFromBase(
    stockInBase,
    productPackageToBaseFactor(product.packageUnit, baseUnit, product.packageToBaseFactor, units, globalRatios),
  );
  return packageQuantity === null ? "" : packageQuantity.toString();
}

function productStockInBase(
  draft: IngredientDraft,
  product: IngredientDraft["products"][number],
  units: UnitRecord[],
  globalRatios: UnitRatioRecord[],
) {
  if (!product.stockQuantity.trim()) return null;
  if (!product.packageUnitId) {
    throw new Error("Choisis l'unité colis pour renseigner le stock.");
  }

  const baseUnit = units.find((unit) => unit.id === draft.baseUnitId);
  const packageUnit = units.find((unit) => unit.id === product.packageUnitId);
  const baseQuantity = convertToBase(
    Number(product.stockQuantity),
    productPackageToBaseFactor(packageUnit, baseUnit, product.packageToBaseFactor, units, globalRatios),
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
    units: Array.from(payloadUnits.values()),
    products: draft.products
      .filter((product) => product.store || product.name)
      .map((product) => ({
        id: product.id,
        store: product.store,
        brand: product.brand,
        name: product.name,
        imageUrl: product.imageUrl,
        storageType: normalizeStorageType(product.storageType),
        stockQuantity: productStockInBase(draft, product, units, globalRatios),
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
