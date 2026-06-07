import { globalConversionFactor } from "@/lib/conversions";
import type {
  IngredientRecord,
  IngredientUnitOption,
  MeasurementRatioRecord,
  RecipeRecord,
  UnitDraft,
  UnitRatioRecord,
  UnitRecord,
} from "@/components/kitchu/types";

export type UnitIngredientImpact = {
  ingredientId: string;
  ingredientName: string;
  reasons: Array<{ title: string; detail: string }>;
};

export function unitImpactedIngredients(
  unitId: string,
  ingredients: IngredientRecord[],
  recipes: RecipeRecord[],
): UnitIngredientImpact[] {
  const impacts = new Map<string, UnitIngredientImpact>();

  function addImpact(
    ingredientId: string,
    ingredientName: string,
    reason: { title: string; detail: string },
  ) {
    const current = impacts.get(ingredientId) ?? { ingredientId, ingredientName, reasons: [] };
    if (!current.reasons.some((item) => item.title === reason.title && item.detail === reason.detail)) {
      current.reasons.push(reason);
    }
    impacts.set(ingredientId, current);
  }

  for (const ingredient of ingredients) {
    if (ingredient.baseUnitId === unitId) {
      addImpact(ingredient.id, ingredient.name, {
        title: "Référence de calcul",
        detail: "Cet ingrédient utilise cette unité comme référence interne; il sera supprimé avec ses produits et ses lignes de recette.",
      });
    }
    if (ingredient.units.some((unit) => unit.unitId === unitId)) {
      addImpact(ingredient.id, ingredient.name, {
        title: "Unité utilisable",
        detail: "Cette unité sera retirée des unités autorisées pour cet ingrédient.",
      });
    }
    const productCount = ingredient.products.filter((product) => product.packageUnitId === unitId).length;
    if (productCount > 0) {
      addImpact(ingredient.id, ingredient.name, {
        title: "Produits magasin",
        detail: `${productCount} produit${productCount > 1 ? "s" : ""} utilisant cette unité sera supprimé${productCount > 1 ? "s" : ""}.`,
      });
    }
  }

  const recipeUsageByIngredient = new Map<string, Set<string>>();
  for (const recipe of recipes) {
    for (const item of recipe.ingredients) {
      if (item.unitId !== unitId) continue;
      const recipeNames = recipeUsageByIngredient.get(item.ingredientId) ?? new Set<string>();
      recipeNames.add(recipe.name);
      recipeUsageByIngredient.set(item.ingredientId, recipeNames);
    }
  }

  for (const [ingredientId, recipeNames] of recipeUsageByIngredient) {
    const ingredient = ingredients.find((item) => item.id === ingredientId);
    if (!ingredient) continue;
    const names = Array.from(recipeNames);
    const visibleNames = names.slice(0, 3).join(", ");
    const extraCount = names.length - 3;
    addImpact(
      ingredient.id,
      ingredient.name,
      {
        title: "Recettes",
        detail: `Les lignes utilisant cette unité seront retirées de ${visibleNames}${extraCount > 0 ? ` et ${extraCount} autre${extraCount > 1 ? "s" : ""}` : ""}.`,
      },
    );
  }

  return Array.from(impacts.values()).sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
}

export function isHardcodedMeasurementKind(kind: string) {
  return kind === "MASS" || kind === "VOLUME";
}

export function unitDraftAsRecord(draft: UnitDraft): UnitRecord | null {
  if (!draft.id) return null;
  return {
    id: draft.id,
    code: draft.code,
    name: draft.name,
    symbol: draft.symbol,
    kind: draft.kind,
    globalBaseUnitId: null,
    globalToBaseFactor: null,
  };
}

export function configurableMeasurementKindsForUnit(unit?: UnitRecord | null) {
  if (!unit || isHardcodedMeasurementKind(unit.kind)) return [];
  return ["MASS", "VOLUME"] as const;
}

export function measurementRatioForUnit(
  currentUnit: UnitRecord,
  targetUnit: UnitRecord,
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
): MeasurementRatioRecord | null {
  for (const ratio of globalRatios) {
    const fromUnit = units.find((unit) => unit.id === ratio.fromUnitId);
    const toUnit = units.find((unit) => unit.id === ratio.toUnitId);
    if (!fromUnit || !toUnit) continue;

    if (ratio.fromUnitId === currentUnit.id) {
      const targetFactor = globalConversionFactor(toUnit, targetUnit, [], units);
      if (targetFactor === null) continue;
      const factorToTarget = ratio.factor * targetFactor;
      if (!Number.isFinite(factorToTarget) || factorToTarget <= 0) continue;
      return { ...ratio, factorToTarget, storedTargetUnit: toUnit };
    }

    if (ratio.toUnitId === currentUnit.id) {
      const targetFactor = globalConversionFactor(fromUnit, targetUnit, [], units);
      if (targetFactor === null) continue;
      const factorToTarget = targetFactor / ratio.factor;
      if (!Number.isFinite(factorToTarget) || factorToTarget <= 0) continue;
      return { ...ratio, factorToTarget, storedTargetUnit: fromUnit };
    }
  }

  return null;
}

export function supportsIngredientSpecificRatio(unit?: UnitRecord | null) {
  return unit ? ["COUNT", "PACKAGE", "CUSTOM"].includes(unit.kind) : false;
}

export function canDefineIngredientSpecificRatio(
  unit: UnitRecord | undefined,
  baseUnit: UnitRecord | undefined,
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
) {
  if (!unit || !baseUnit || unit.id === baseUnit.id) return false;
  return supportsIngredientSpecificRatio(unit) && globalConversionFactor(unit, baseUnit, globalRatios, units) === null;
}

export function specificIngredientUnits(
  ingredient: IngredientRecord,
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
) {
  return ingredient.units.filter((entry) =>
    canDefineIngredientSpecificRatio(entry.unit, ingredient.baseUnit, globalRatios, units) &&
    Boolean(entry.toBaseFactor),
  );
}

export function usableUnitsForIngredient(
  ingredient: IngredientRecord,
  units: UnitRecord[],
  globalRatios: UnitRatioRecord[],
): IngredientUnitOption[] {
  const byId = new Map<string, IngredientUnitOption>();

  for (const unit of units) {
    if (globalConversionFactor(unit, ingredient.baseUnit, globalRatios, units) === null) continue;
    byId.set(unit.id, {
      id: `${ingredient.id}-${unit.id}-auto`,
      unitId: unit.id,
      toBaseFactor: null,
      unit,
      source: "automatic",
    });
  }

  for (const entry of ingredient.units) {
    if (!canDefineIngredientSpecificRatio(entry.unit, ingredient.baseUnit, globalRatios, units)) continue;
    if (!entry.toBaseFactor) continue;
    byId.set(entry.unitId, {
      id: entry.id,
      unitId: entry.unitId,
      toBaseFactor: entry.toBaseFactor,
      unit: entry.unit,
      source: "specific",
    });
  }

  return Array.from(byId.values()).sort((a, b) => {
    if (a.unitId === ingredient.baseUnitId) return -1;
    if (b.unitId === ingredient.baseUnitId) return 1;
    if (a.source !== b.source) return a.source === "automatic" ? -1 : 1;
    if (a.unit.kind !== b.unit.kind) return a.unit.kind.localeCompare(b.unit.kind);
    return a.unit.name.localeCompare(b.unit.name);
  });
}

export const baseMeasurementKinds = ["MASS", "VOLUME", "COUNT"] as const;

export function measurementKindLabel(kind: string) {
  switch (kind) {
    case "MASS":
      return "Masse";
    case "VOLUME":
      return "Volume";
    case "COUNT":
      return "Comptage";
    case "PACKAGE":
      return "Conditionnement";
    case "CUSTOM":
      return "Personnalisée";
    default:
      return kind;
  }
}

export function canonicalBaseUnitForKind(kind: string, units: UnitRecord[]) {
  const preferredCode = {
    MASS: "g",
    VOLUME: "ml",
    COUNT: "piece",
  }[kind];
  return units.find((unit) => unit.code === preferredCode) ?? units.find((unit) => unit.kind === kind);
}

export function baseMeasurementOptions(units: UnitRecord[]) {
  return baseMeasurementKinds
    .map((kind) => ({ kind, unit: canonicalBaseUnitForKind(kind, units) }))
    .filter((option): option is { kind: (typeof baseMeasurementKinds)[number]; unit: UnitRecord } =>
      Boolean(option.unit),
    );
}

export function formatImpactCount(count: number) {
  return `${count} ingrédient${count > 1 ? "s" : ""} impacté${count > 1 ? "s" : ""}`;
}
