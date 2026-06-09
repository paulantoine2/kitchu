import { revalidatePath } from "next/cache";

export function revalidateKitchuPaths({
  recipeId,
  ingredientId,
  unitId,
}: {
  recipeId?: string;
  ingredientId?: string;
  unitId?: string;
} = {}) {
  revalidatePath("/");
  revalidatePath("/recipes");
  revalidatePath("/ingredients");
  revalidatePath("/units");

  if (recipeId) {
    revalidatePath(`/recipes/${recipeId}`);
    revalidatePath(`/recipes/${recipeId}/edit`);
  }

  if (ingredientId) {
    revalidatePath(`/ingredients/${ingredientId}`);
  }

  if (unitId) {
    revalidatePath(`/units/${unitId}`);
  }
}
