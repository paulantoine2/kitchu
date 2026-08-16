import type { IngredientRecord, RecipeDraft, RecipeRecord } from "@/components/kitchu/types";

export function ingredientImageUrl(ingredient?: IngredientRecord | null) {
  if (!ingredient) return null;
  return ingredient.imageUrl || ingredient.products.find((product) => product.imageUrl)?.imageUrl || null;
}

export function recipeImageUrl(recipe?: RecipeRecord | null) {
  if (!recipe) return null;
  return recipe.imageUrl || recipe.ingredients.map((item) => ingredientImageUrl(item.ingredient)).find(Boolean) || null;
}

export function draftRecipeImageUrl(draft: RecipeDraft, ingredients: IngredientRecord[]) {
  return (
    draft.imageUrl ||
    draft.ingredients
      .map((row) => ingredients.find((ingredient) => ingredient.id === row.ingredientId))
      .map((ingredient) => ingredientImageUrl(ingredient))
      .find(Boolean) ||
    null
  );
}
