import { prisma } from "@/lib/prisma";
import { totalProductStock } from "@/lib/product-storage";
import { createPerfTimer, measurePerf } from "@/lib/perf-log";
import type { CartRecipeEntry, IngredientRecord, RecipeRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";

const ingredientInclude = {
  baseUnit: true,
  units: { include: { unit: true }, orderBy: { unit: { name: "asc" } } },
  products: { include: { packageUnit: true }, orderBy: { updatedAt: "desc" } },
} as const;

const recipeInclude = {
  ingredients: {
    include: {
      unit: true,
      ingredient: { include: ingredientInclude },
    },
    orderBy: { position: "asc" as const },
  },
  steps: { orderBy: { position: "asc" as const } },
} as const;

type IngredientWithProducts = {
  products: Array<{ stockQuantity: number | null }>;
};

type IngredientDbRow = Omit<IngredientRecord, "stock"> & IngredientWithProducts;

type RecipeDbRow = Omit<RecipeRecord, "ingredients"> & {
  ingredients: Array<
    Omit<RecipeRecord["ingredients"][number], "ingredient"> & {
      ingredient: IngredientDbRow;
    }
  >;
};

function serializeIngredient(ingredient: IngredientDbRow): IngredientRecord {
  const totalStock = totalProductStock(ingredient.products);
  return {
    ...ingredient,
    stock: totalStock !== null ? { quantity: totalStock } : null,
  };
}

function serializeRecipe(recipe: RecipeDbRow): RecipeRecord {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((item) => ({
      ...item,
      ingredient: serializeIngredient(item.ingredient),
    })),
  };
}

function toClientData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function collectIngredientsFromRecipes(recipes: RecipeDbRow[]) {
  const ingredients = new Map<string, IngredientRecord>();
  for (const recipe of recipes) {
    for (const item of recipe.ingredients) {
      ingredients.set(item.ingredient.id, serializeIngredient(item.ingredient));
    }
  }
  return ingredients;
}

export type KitchuData = {
  units: UnitRecord[];
  globalRatios: UnitRatioRecord[];
  ingredients: IngredientRecord[];
  recipes: RecipeRecord[];
  cartItems: CartRecipeEntry[];
};

async function fetchCartContext() {
  return measurePerf("data:fetchCartContext", "total", async () => {
    const cartItems = await measurePerf("data:fetchCartContext", "cartItem.findMany", () =>
      prisma.cartItem.findMany({
        orderBy: { updatedAt: "asc" },
        select: { recipeId: true, portions: true },
      }),
    );
    const cartRecipeIds = cartItems.map((item) => item.recipeId);
    if (cartRecipeIds.length === 0) {
      const recipes: RecipeDbRow[] = [];
      return { cartItems, recipes, ingredients: new Map<string, IngredientRecord>() };
    }

    const recipes = await measurePerf(
      "data:fetchCartContext",
      "recipe.findMany",
      () =>
        prisma.recipe.findMany({
          where: { id: { in: cartRecipeIds } },
          orderBy: { updatedAt: "desc" },
          include: recipeInclude,
        }),
      { cartRecipeCount: cartRecipeIds.length },
    );

    const ingredients = collectIngredientsFromRecipes(recipes);
    return { cartItems, recipes, ingredients };
  });
}

export async function fetchIngredientPageData(ingredientId?: string): Promise<KitchuData> {
  const timer = createPerfTimer("data:fetchIngredientPageData", { ingredientId: ingredientId ?? "new" });

  const [units, globalRatios, cartContext, ingredient] = await Promise.all([
    measurePerf("data:fetchIngredientPageData", "unit.findMany", () =>
      prisma.unit.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    ),
    measurePerf("data:fetchIngredientPageData", "unitRatio.findMany", () =>
      prisma.unitRatio.findMany({ orderBy: { updatedAt: "desc" } }),
    ),
    fetchCartContext(),
    ingredientId
      ? measurePerf("data:fetchIngredientPageData", "ingredient.findUnique", () =>
          prisma.ingredient.findUnique({
            where: { id: ingredientId },
            include: ingredientInclude,
          }),
        )
      : Promise.resolve(null),
  ]);

  const ingredients = new Map(cartContext.ingredients);
  if (ingredient) {
    ingredients.set(ingredient.id, serializeIngredient(ingredient));
  }

  const result = {
    units: toClientData(units),
    globalRatios: toClientData(globalRatios),
    cartItems: toClientData(cartContext.cartItems),
    recipes: toClientData(cartContext.recipes.map(serializeRecipe)),
    ingredients: toClientData(
      Array.from(ingredients.values()).sort((left, right) => left.name.localeCompare(right.name, "fr")),
    ),
  };

  timer.end("done", {
    ingredientCount: result.ingredients.length,
    recipeCount: result.recipes.length,
    cartItemCount: result.cartItems.length,
  });

  return result;
}

export async function fetchKitchuData(): Promise<KitchuData> {
  const timer = createPerfTimer("data:fetchKitchuData");

  const [units, globalRatios, ingredients, recipes, cartItems] = await Promise.all([
    measurePerf("data:fetchKitchuData", "unit.findMany", () =>
      prisma.unit.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    ),
    measurePerf("data:fetchKitchuData", "unitRatio.findMany", () =>
      prisma.unitRatio.findMany({ orderBy: { updatedAt: "desc" } }),
    ),
    measurePerf("data:fetchKitchuData", "ingredient.findMany", () =>
      prisma.ingredient.findMany({
        orderBy: { name: "asc" },
        include: ingredientInclude,
      }),
    ),
    measurePerf("data:fetchKitchuData", "recipe.findMany", () =>
      prisma.recipe.findMany({
        orderBy: { updatedAt: "desc" },
        include: recipeInclude,
      }),
    ),
    measurePerf("data:fetchKitchuData", "cartItem.findMany", () =>
      prisma.cartItem.findMany({
        orderBy: { updatedAt: "asc" },
        select: { recipeId: true, portions: true },
      }),
    ),
  ]);

  const result = {
    units: toClientData(units),
    globalRatios: toClientData(globalRatios),
    ingredients: toClientData(ingredients.map(serializeIngredient)),
    recipes: toClientData(recipes.map(serializeRecipe)),
    cartItems: toClientData(cartItems),
  };

  timer.end("done", {
    ingredientCount: result.ingredients.length,
    recipeCount: result.recipes.length,
    cartItemCount: result.cartItems.length,
  });

  return result;
}
