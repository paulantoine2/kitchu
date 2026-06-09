import { prisma } from "@/lib/prisma";
import { totalProductStock } from "@/lib/product-storage";
import type { CartRecipeEntry, IngredientRecord, RecipeRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";

const ingredientInclude = {
  baseUnit: true,
  units: { include: { unit: true }, orderBy: { unit: { name: "asc" } } },
  products: { include: { packageUnit: true }, orderBy: { updatedAt: "desc" } },
} as const;

type IngredientWithProducts = {
  products: Array<{ stockQuantity: number | null }>;
};

function serializeIngredient<T extends IngredientWithProducts>(ingredient: T) {
  const totalStock = totalProductStock(ingredient.products);
  return {
    ...ingredient,
    stock: totalStock !== null ? { quantity: totalStock } : null,
  };
}

export type KitchuData = {
  units: UnitRecord[];
  globalRatios: UnitRatioRecord[];
  ingredients: IngredientRecord[];
  recipes: RecipeRecord[];
  cartItems: CartRecipeEntry[];
};

export async function fetchKitchuData(): Promise<KitchuData> {
  const [units, globalRatios, ingredients, recipes, cartItems] = await Promise.all([
    prisma.unit.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    prisma.unitRatio.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.ingredient.findMany({
      orderBy: { name: "asc" },
      include: ingredientInclude,
    }),
    prisma.recipe.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        ingredients: {
          include: {
            unit: true,
            ingredient: { include: ingredientInclude },
          },
          orderBy: { position: "asc" },
        },
        steps: { orderBy: { position: "asc" } },
      },
    }),
    prisma.cartItem.findMany({
      orderBy: { updatedAt: "asc" },
      select: { recipeId: true, portions: true },
    }),
  ]);

  return {
    units: JSON.parse(JSON.stringify(units)),
    globalRatios: JSON.parse(JSON.stringify(globalRatios)),
    ingredients: JSON.parse(JSON.stringify(ingredients.map(serializeIngredient))),
    recipes: JSON.parse(
      JSON.stringify(
        recipes.map((recipe) => ({
          ...recipe,
          ingredients: recipe.ingredients.map((item) => ({
            ...item,
            ingredient: serializeIngredient(item.ingredient),
          })),
        })),
      ),
    ),
    cartItems: JSON.parse(JSON.stringify(cartItems)),
  };
}
