import { convertToBase, globalConversionFactor } from "@/lib/conversions";
import { formatNumber } from "@/lib/utils";
import { canonicalBaseUnitForKind, recipeLineToBaseFactor } from "@/components/kitchu/unit-helpers";
import type { IngredientRecord, RecipeDraft, RecipeRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";

export type RecipeWeightLine = {
  ingredientId: string;
  ingredientName: string;
  rawGrams: number;
  preparedGrams: number;
  ratio: number;
};

export type RecipeWeightEstimate = {
  gramsPerServing: number | null;
  isComplete: boolean;
  lines: RecipeWeightLine[];
  missingIngredientNames: string[];
};

type RecipeIngredientRow = RecipeRecord["ingredients"][number];

export function effectivePreparationWeightRatio(
  ingredientRatio: number | null | undefined,
  recipeRatio: number | null | undefined,
) {
  const candidate = recipeRatio ?? ingredientRatio ?? 1;
  if (!Number.isFinite(candidate) || candidate <= 0) return 1;
  return candidate;
}

function ingredientMassInGrams(
  item: RecipeIngredientRow,
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
) {
  const { baseUnit } = item.ingredient;
  if (baseUnit.kind !== "MASS" && baseUnit.kind !== "VOLUME") return null;

  const baseFactor = recipeLineToBaseFactor(
    item.ingredient,
    item.unit,
    item.unitId,
    item.unitToBaseFactor,
    globalRatios,
    units,
  );
  const baseQuantity = convertToBase(item.quantityPerServing, baseFactor);
  if (baseQuantity === null) return null;

  if (baseUnit.kind === "VOLUME") {
    const millilitreUnit = canonicalBaseUnitForKind("VOLUME", units);
    if (!millilitreUnit) return null;

    const millilitres =
      baseUnit.id === millilitreUnit.id
        ? baseQuantity
        : convertToBase(
            baseQuantity,
            globalConversionFactor(baseUnit, millilitreUnit, globalRatios, units),
          );
    if (millilitres === null || !Number.isFinite(millilitres) || millilitres < 0) return null;

    // Approximation : 1 ml = 1 g (donc 1 L = 1 kg).
    return millilitres;
  }

  const gramUnit = canonicalBaseUnitForKind("MASS", units);
  if (!gramUnit) return null;

  const gramsFactor = globalConversionFactor(baseUnit, gramUnit, globalRatios, units);
  if (gramsFactor === null) return null;

  const grams = baseQuantity * gramsFactor;
  if (!Number.isFinite(grams) || grams < 0) return null;
  return grams;
}

export function estimateRecipeWeightPerServing(
  recipe: Pick<RecipeRecord, "ingredients">,
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
): RecipeWeightEstimate {
  const lines: RecipeWeightLine[] = [];
  const missingIngredientNames: string[] = [];

  for (const item of recipe.ingredients) {
    if (item.ingredient.baseUnit.kind !== "MASS" && item.ingredient.baseUnit.kind !== "VOLUME") {
      continue;
    }

    const rawGrams = ingredientMassInGrams(item, globalRatios, units);
    if (rawGrams === null) {
      missingIngredientNames.push(item.ingredient.name);
      continue;
    }

    const ratio = effectivePreparationWeightRatio(
      item.ingredient.preparationWeightRatio,
      item.preparationWeightRatio,
    );
    lines.push({
      ingredientId: item.ingredientId,
      ingredientName: item.ingredient.name,
      rawGrams,
      preparedGrams: rawGrams * ratio,
      ratio,
    });
  }

  if (lines.length === 0) {
    return {
      gramsPerServing: null,
      isComplete: missingIngredientNames.length === 0,
      lines,
      missingIngredientNames,
    };
  }

  const gramsPerServing = lines.reduce((sum, line) => sum + line.preparedGrams, 0);
  return {
    gramsPerServing,
    isComplete: missingIngredientNames.length === 0,
    lines,
    missingIngredientNames,
  };
}

export function formatRecipeWeight(grams: number | null) {
  if (grams === null || !Number.isFinite(grams)) return null;
  if (grams >= 1000) {
    return `${formatNumber(grams / 1000)} kg`;
  }
  return `${formatNumber(grams)} g`;
}

export function estimateDraftRecipeWeightPerServing(
  draft: RecipeDraft,
  ingredients: IngredientRecord[],
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
) {
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const recipeIngredients: RecipeRecord["ingredients"] = [];

  draft.ingredients.forEach((row, position) => {
    const ingredient = ingredientById.get(row.ingredientId);
    const unit = units.find((item) => item.id === row.unitId);
    const quantity = Number(row.quantityPerServing);
    if (!ingredient || !unit || !Number.isFinite(quantity) || quantity <= 0) return;

    recipeIngredients.push({
      id: row.key,
      ingredientId: row.ingredientId,
      unitId: row.unitId,
      quantityPerServing: quantity,
      unitToBaseFactor: row.unitToBaseFactor.trim() ? Number(row.unitToBaseFactor) : null,
      preparationWeightRatio: row.preparationWeightRatio.trim()
        ? Number(row.preparationWeightRatio)
        : null,
      note: row.note || null,
      position,
      ingredient,
      unit,
    });
  });

  return estimateRecipeWeightPerServing({ ingredients: recipeIngredients }, globalRatios, units);
}
