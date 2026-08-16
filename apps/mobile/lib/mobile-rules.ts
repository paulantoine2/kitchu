import { recipeMatchPercent, type RecipeRecord } from "@kitchu/domain";

export type RecipeSort = "recent" | "name" | "match";

export function filterAndSortRecipes(
  recipes: RecipeRecord[],
  search: string,
  sort: RecipeSort,
) {
  const normalized = search.trim().toLocaleLowerCase("fr");
  const filtered = recipes.filter(
    (recipe) =>
      recipe.name.toLocaleLowerCase("fr").includes(normalized) ||
      recipe.ingredients.some((line) =>
        line.ingredient.name.toLocaleLowerCase("fr").includes(normalized),
      ),
  );

  if (sort === "name") return filtered.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  if (sort === "match") {
    return filtered.sort((a, b) => recipeMatchPercent(b) - recipeMatchPercent(a));
  }
  return filtered;
}

export function canAccessAdmin(role: string | null | undefined) {
  return role === "ADMIN";
}

export function assertOnline(isConnected: boolean | null | undefined) {
  if (isConnected === false) {
    throw new Error("Une connexion est nécessaire pour enregistrer.");
  }
}
