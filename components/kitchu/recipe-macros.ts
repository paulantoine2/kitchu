import { formatNumber } from "@/lib/utils";
import { productOptionsForIngredient } from "@/components/kitchu/recipe-cost";
import { ingredientMassInGrams } from "@/components/kitchu/recipe-weight";
import type { IngredientRecord, MacroProfile, RecipeDraft, RecipeRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type RecipeMacroLine = {
  ingredientId: string;
  ingredientName: string;
  grams: number;
  macros: MacroTotals;
  hasData: boolean;
};

export type RecipeMacroEstimate = {
  perServing: MacroTotals | null;
  isComplete: boolean;
  lines: RecipeMacroLine[];
  missingIngredientNames: string[];
};

const emptyMacroTotals = (): MacroTotals => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
});

function effectiveMacroValue(
  productValue: number | null | undefined,
  ingredientValue: number | null | undefined,
) {
  return productValue ?? ingredientValue ?? null;
}

export function hasMacroProfile(profile: MacroProfile) {
  return (
    profile.caloriesPer100g !== null ||
    profile.proteinPer100g !== null ||
    profile.carbsPer100g !== null ||
    profile.fatPer100g !== null
  );
}

export function effectiveMacroProfile(
  ingredient: IngredientRecord,
  product?: IngredientRecord["products"][number] | null,
): MacroProfile {
  return {
    caloriesPer100g: effectiveMacroValue(product?.caloriesPer100g, ingredient.caloriesPer100g),
    proteinPer100g: effectiveMacroValue(product?.proteinPer100g, ingredient.proteinPer100g),
    carbsPer100g: effectiveMacroValue(product?.carbsPer100g, ingredient.carbsPer100g),
    fatPer100g: effectiveMacroValue(product?.fatPer100g, ingredient.fatPer100g),
  };
}

function macrosFromGrams(grams: number, profile: MacroProfile): MacroTotals {
  const factor = grams / 100;
  return {
    calories: (profile.caloriesPer100g ?? 0) * factor,
    protein: (profile.proteinPer100g ?? 0) * factor,
    carbs: (profile.carbsPer100g ?? 0) * factor,
    fat: (profile.fatPer100g ?? 0) * factor,
  };
}

function addMacroTotals(left: MacroTotals, right: MacroTotals): MacroTotals {
  return {
    calories: left.calories + right.calories,
    protein: left.protein + right.protein,
    carbs: left.carbs + right.carbs,
    fat: left.fat + right.fat,
  };
}

function cheapestProductForIngredient(
  ingredient: IngredientRecord,
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
) {
  const options = productOptionsForIngredient(ingredient, globalRatios, units);
  return options.reduce<(typeof options)[number] | null>(
    (best, option) => (!best || option.unitPrice < best.unitPrice ? option : best),
    null,
  )?.product ?? null;
}

type RecipeIngredientRow = RecipeRecord["ingredients"][number];

export function estimateRecipeMacrosPerServing(
  recipe: Pick<RecipeRecord, "ingredients">,
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
): RecipeMacroEstimate {
  const lines: RecipeMacroLine[] = [];
  const missingIngredientNames: string[] = [];

  for (const item of recipe.ingredients) {
    if (item.ingredient.baseUnit.kind !== "MASS" && item.ingredient.baseUnit.kind !== "VOLUME") {
      continue;
    }

    const grams = ingredientMassInGrams(item, globalRatios, units);
    if (grams === null) {
      missingIngredientNames.push(item.ingredient.name);
      continue;
    }
    const product = cheapestProductForIngredient(item.ingredient, globalRatios, units);
    const profile = effectiveMacroProfile(item.ingredient, product);
    const hasData = hasMacroProfile(profile);

    if (!hasData) {
      missingIngredientNames.push(item.ingredient.name);
    }

    lines.push({
      ingredientId: item.ingredientId,
      ingredientName: item.ingredient.name,
      grams,
      macros: hasData ? macrosFromGrams(grams, profile) : emptyMacroTotals(),
      hasData,
    });
  }

  const contributingLines = lines.filter((line) => line.hasData);
  if (contributingLines.length === 0) {
    return {
      perServing: null,
      isComplete: missingIngredientNames.length === 0,
      lines,
      missingIngredientNames,
    };
  }

  const perServing = contributingLines.reduce(
    (total, line) => addMacroTotals(total, line.macros),
    emptyMacroTotals(),
  );

  return {
    perServing,
    isComplete: missingIngredientNames.length === 0,
    lines,
    missingIngredientNames,
  };
}

export function formatMacroCalories(calories: number | null) {
  if (calories === null || !Number.isFinite(calories)) return null;
  return `${Math.round(calories)} kcal`;
}

export function formatMacroPer100gCell(value: number | null, kind: "calories" | "grams") {
  if (value === null || !Number.isFinite(value)) return "—";
  if (kind === "calories") {
    return formatMacroCalories(value) ?? "—";
  }
  return `${formatNumber(value)} g`;
}

export function formatMacroProfilePer100gSummary(profile: MacroProfile) {
  if (!hasMacroProfile(profile)) return null;

  const parts = [
    formatMacroCalories(profile.caloriesPer100g),
    profile.proteinPer100g !== null ? `P ${formatNumber(profile.proteinPer100g)} g` : null,
    profile.carbsPer100g !== null ? `G ${formatNumber(profile.carbsPer100g)} g` : null,
    profile.fatPer100g !== null ? `L ${formatNumber(profile.fatPer100g)} g` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length ? parts.join(" · ") : null;
}

export function formatRecipeMacrosSummary(totals: MacroTotals | null) {
  if (!totals) return null;

  const parts = [
    formatMacroCalories(totals.calories),
    totals.protein > 0 ? `P ${formatNumber(totals.protein)} g` : null,
    totals.carbs > 0 ? `G ${formatNumber(totals.carbs)} g` : null,
    totals.fat > 0 ? `L ${formatNumber(totals.fat)} g` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length ? parts.join(" · ") : null;
}

export function estimateDraftRecipeMacrosPerServing(
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

  return estimateRecipeMacrosPerServing({ ingredients: recipeIngredients }, globalRatios, units);
}
