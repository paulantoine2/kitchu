import { convertToBase, effectiveToBaseFactor, globalConversionFactor } from "./conversions";
import type { CartRecipeEntry, IngredientRecord, RecipeRecord, UnitRatioRecord, UnitRecord } from "./types";

export function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits }).format(value);
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function ingredientImageUrl(ingredient?: IngredientRecord | null) {
  return ingredient?.imageUrl ?? ingredient?.products.find((product) => product.imageUrl)?.imageUrl ?? null;
}

export function recipeImageUrl(recipe?: RecipeRecord | null) {
  return recipe?.imageUrl ?? recipe?.ingredients.map((line) => ingredientImageUrl(line.ingredient)).find(Boolean) ?? null;
}

export function addOrUpdateCartItem(items: CartRecipeEntry[], recipeId: string, portions: number) {
  const normalized = Math.max(1, Math.floor(portions) || 1);
  return items.some((item) => item.recipeId === recipeId)
    ? items.map((item) => item.recipeId === recipeId ? { ...item, portions: normalized } : item)
    : [...items, { recipeId, portions: normalized }];
}

export function updateCartItemPortions(items: CartRecipeEntry[], recipeId: string, portions: number) {
  return addOrUpdateCartItem(items, recipeId, portions);
}

export function removeCartItem(items: CartRecipeEntry[], recipeId: string) {
  return items.filter((item) => item.recipeId !== recipeId);
}

export function unitToBaseFactor(
  ingredient: IngredientRecord,
  unit: UnitRecord,
  explicitFactor: number | null,
  ratios: UnitRatioRecord[],
  units: UnitRecord[],
) {
  const specific = ingredient.units.find((entry) => entry.unitId === unit.id)?.toBaseFactor;
  return effectiveToBaseFactor(unit, ingredient.baseUnit, explicitFactor ?? specific, ratios, {
    allowSpecific: true,
    units,
  });
}

export function recipeMatchPercent(recipe: RecipeRecord) {
  const total = recipe.ingredients.length;
  if (!total) return 0;
  const available = recipe.ingredients.filter((line) => (line.ingredient.stock?.quantity ?? 0) > 0).length;
  return Math.round((available / total) * 100);
}

export function estimateRecipeMacros(recipe: RecipeRecord, portions = 1) {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, complete: true };
  for (const line of recipe.ingredients) {
    const factor = unitToBaseFactor(line.ingredient, line.unit, line.unitToBaseFactor, [], [line.unit, line.ingredient.baseUnit]);
    const quantity = convertToBase(line.quantityPerServing * portions, factor);
    const profile = line.ingredient;
    if (quantity === null || profile.caloriesPer100g === null) {
      totals.complete = false;
      continue;
    }
    const multiplier = quantity / 100;
    totals.calories += profile.caloriesPer100g * multiplier;
    totals.protein += (profile.proteinPer100g ?? 0) * multiplier;
    totals.carbs += (profile.carbsPer100g ?? 0) * multiplier;
    totals.fat += (profile.fatPer100g ?? 0) * multiplier;
  }
  return totals;
}

export function productBaseQuantity(
  product: IngredientRecord["products"][number],
  ingredient: IngredientRecord,
  ratios: UnitRatioRecord[],
  units: UnitRecord[],
) {
  const factor = effectiveToBaseFactor(
    product.packageUnit,
    ingredient.baseUnit,
    product.packageToBaseFactor,
    ratios,
    { allowSpecific: true, units },
  );
  return factor === null ? null : product.packageQuantity * factor;
}

export function cheapestIngredientPrice(
  ingredient: IngredientRecord,
  ratios: UnitRatioRecord[],
  units: UnitRecord[],
) {
  return ingredient.products.reduce<number | null>((best, product) => {
    const quantity = productBaseQuantity(product, ingredient, ratios, units);
    if (!quantity || quantity <= 0) return best;
    const price = product.priceOverride ?? product.price;
    const unitPrice = price / quantity;
    return best === null || unitPrice < best ? unitPrice : best;
  }, null);
}

export function canConvert(unit: UnitRecord, baseUnit: UnitRecord, ratios: UnitRatioRecord[], units: UnitRecord[]) {
  return globalConversionFactor(unit, baseUnit, ratios, units) !== null;
}
