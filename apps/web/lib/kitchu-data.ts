import { prisma } from "@/lib/prisma";
import { totalProductStock } from "@/lib/product-storage";
import { createPerfTimer, measurePerf } from "@/lib/perf-log";
import { getReferenceData } from "@/lib/reference-data";
import { getOptionalUser, type Viewer } from "@/lib/auth-user";
import { resolvePersonalProductState } from "@/lib/multi-user";
import type { CartRecipeEntry, IngredientRecord, RecipeRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";

function ingredientInclude(viewer: Viewer | null) {
  return {
    baseUnit: true,
    units: { include: { unit: true }, orderBy: { unit: { name: "asc" as const } } },
    products: {
      where: viewer
        ? { OR: [{ ownerId: null }, { ownerId: viewer.id }] }
        : { ownerId: null },
      include: {
        packageUnit: true,
        userStates: {
          where: { userId: viewer?.id ?? "__guest__" },
          select: { stockQuantity: true, priceOverride: true },
        },
      },
      orderBy: { updatedAt: "desc" as const },
    },
  } as const;
}

function recipeInclude(viewer: Viewer | null) {
  return {
    ingredients: {
      include: {
        unit: true,
        ingredient: { include: ingredientInclude(viewer) },
      },
      orderBy: { position: "asc" as const },
    },
    steps: { orderBy: { position: "asc" as const } },
  } as const;
}

type ProductDbRow = Omit<IngredientRecord["products"][number], "stockQuantity" | "catalogPrice" | "priceOverride"> & {
  userStates: Array<{ stockQuantity: number | null; priceOverride: number | null }>;
};

type IngredientDbRow = Omit<IngredientRecord, "stock" | "products"> & {
  products: ProductDbRow[];
};

type RecipeDbRow = Omit<RecipeRecord, "ingredients"> & {
  ingredients: Array<
    Omit<RecipeRecord["ingredients"][number], "ingredient"> & {
      ingredient: IngredientDbRow;
    }
  >;
};

function serializeIngredient(ingredient: IngredientDbRow): IngredientRecord {
  const products = ingredient.products.map(({ userStates, ...product }) => {
    const state = userStates[0];
    return {
      ...product,
      ...resolvePersonalProductState(product.price, state),
    };
  });
  const totalStock = totalProductStock(products);
  return {
    ...ingredient,
    products,
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
  viewer: Viewer | null;
};

async function fetchCartContext(viewer: Viewer | null) {
  return measurePerf("data:fetchCartContext", "total", async () => {
    const cartItems = viewer
      ? await measurePerf("data:fetchCartContext", "cartItem.findMany", () => prisma.cartItem.findMany({
        where: { userId: viewer.id },
        orderBy: { updatedAt: "asc" },
        select: { recipeId: true, portions: true },
      }))
      : [];
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
          include: recipeInclude(viewer),
        }),
      { cartRecipeCount: cartRecipeIds.length },
    );

    const ingredients = collectIngredientsFromRecipes(recipes);
    return { cartItems, recipes, ingredients };
  });
}

export async function fetchIngredientPageData(ingredientId?: string): Promise<KitchuData> {
  const timer = createPerfTimer("data:fetchIngredientPageData", { ingredientId: ingredientId ?? "new" });
  const viewer = await getOptionalUser();

  const [{ units, globalRatios }, cartContext, ingredient] = await Promise.all([
    measurePerf("data:fetchIngredientPageData", "referenceData", () => getReferenceData()),
    fetchCartContext(viewer),
    ingredientId
      ? measurePerf("data:fetchIngredientPageData", "ingredient.findUnique", () =>
          prisma.ingredient.findUnique({
            where: { id: ingredientId },
            include: ingredientInclude(viewer),
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
    viewer,
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
  const viewer = await getOptionalUser();

  const [{ units, globalRatios }, ingredients, recipes, cartItems] = await Promise.all([
    measurePerf("data:fetchKitchuData", "referenceData", () => getReferenceData()),
    measurePerf("data:fetchKitchuData", "ingredient.findMany", () =>
      prisma.ingredient.findMany({
        orderBy: { name: "asc" },
        include: ingredientInclude(viewer),
      }),
    ),
    measurePerf("data:fetchKitchuData", "recipe.findMany", () =>
      prisma.recipe.findMany({
        orderBy: { updatedAt: "desc" },
        include: recipeInclude(viewer),
      }),
    ),
    viewer
      ? measurePerf("data:fetchKitchuData", "cartItem.findMany", () => prisma.cartItem.findMany({
        where: { userId: viewer.id },
        orderBy: { updatedAt: "asc" },
        select: { recipeId: true, portions: true },
      }))
      : Promise.resolve([]),
  ]);

  const result = {
    units: toClientData(units),
    globalRatios: toClientData(globalRatios),
    ingredients: toClientData(ingredients.map(serializeIngredient)),
    recipes: toClientData(recipes.map(serializeRecipe)),
    cartItems: toClientData(cartItems),
    viewer,
  };

  timer.end("done", {
    ingredientCount: result.ingredients.length,
    recipeCount: result.recipes.length,
    cartItemCount: result.cartItems.length,
  });

  return result;
}
