import { recipeToDraft } from "@/components/kitchu/drafts";
import { ingredientImageUrl } from "@/components/kitchu/images";
import {
  estimateRecipeCosts,
  optimizePurchase,
  productOptionsForIngredient,
  sumPartial,
  type ProductOption,
  type PurchasePlan,
} from "@/components/kitchu/recipe-cost";
import type { IngredientRecord, RecipeRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";

export type CartRecipeEntry = {
  recipeId: string;
  portions: number;
};

export type CartRecipeLine = {
  recipeId: string;
  recipeName: string;
  recipeImageUrl: string | null;
  portions: number;
  usedMerchandiseValue: number | null;
};

export type CartUsageShare = {
  recipeId: string;
  recipeName: string;
  percent: number;
};

export type CartProductLine = {
  ingredientId: string;
  ingredientName: string;
  ingredientImageUrl: string | null;
  product: IngredientRecord["products"][number];
  count: number;
  totalBaseQuantity: number;
  unitPrice: number;
  totalPrice: number;
  baseUnit: UnitRecord;
  usage: CartUsageShare[];
  leftoverPercent: number;
  missingReason: string | null;
};

export type CartPurchaseSummary = {
  recipeLines: CartRecipeLine[];
  productLines: CartProductLine[];
  totalPrice: PartialSum;
  leftoverValue: PartialSum;
};

type PartialSum = {
  total: number | null;
  isComplete: boolean;
};

type IngredientDemand = {
  recipeId: string;
  recipeName: string;
  requiredBaseQuantity: number;
};

export function getCartItem(items: CartRecipeEntry[], recipeId: string) {
  return items.find((item) => item.recipeId === recipeId);
}

export function addOrUpdateCartItem(items: CartRecipeEntry[], recipeId: string, portions: number) {
  const normalizedPortions = Math.max(1, Math.floor(portions) || 1);
  const existing = getCartItem(items, recipeId);
  if (existing) {
    return items.map((item) =>
      item.recipeId === recipeId ? { ...item, portions: normalizedPortions } : item,
    );
  }
  return [...items, { recipeId, portions: normalizedPortions }];
}

export function removeCartItem(items: CartRecipeEntry[], recipeId: string) {
  return items.filter((item) => item.recipeId !== recipeId);
}

export function updateCartItemPortions(items: CartRecipeEntry[], recipeId: string, portions: number) {
  const normalizedPortions = Math.max(1, Math.floor(portions) || 1);
  return items.map((item) =>
    item.recipeId === recipeId ? { ...item, portions: normalizedPortions } : item,
  );
}

function allocateStockProportionally(demands: IngredientDemand[], stockAvailable: number) {
  const totalRequired = demands.reduce((sum, demand) => sum + demand.requiredBaseQuantity, 0);
  const stockUsed = Math.min(stockAvailable, totalRequired);
  const stockByRecipeId = new Map<string, number>();
  let allocated = 0;

  for (const [index, demand] of demands.entries()) {
    if (index === demands.length - 1) {
      stockByRecipeId.set(demand.recipeId, stockUsed - allocated);
      continue;
    }

    const share = totalRequired > 0 ? (demand.requiredBaseQuantity / totalRequired) * stockUsed : 0;
    stockByRecipeId.set(demand.recipeId, share);
    allocated += share;
  }

  return stockByRecipeId;
}

function cheapestUnitPrice(options: ProductOption[]) {
  return options.reduce<number | null>(
    (best, option) => (best === null || option.unitPrice < best ? option.unitPrice : best),
    null,
  );
}

function stockValueByRecipe(
  demands: IngredientDemand[],
  stockByRecipeId: Map<string, number>,
  unitPrice: number,
) {
  const values = new Map<string, number>();
  for (const demand of demands) {
    const stockQuantity = stockByRecipeId.get(demand.recipeId) ?? 0;
    if (stockQuantity <= 0 || unitPrice <= 0) continue;
    values.set(demand.recipeId, stockQuantity * unitPrice);
  }
  return values;
}

export function recipeShareValue(line: CartProductLine, recipeId: string) {
  if (line.missingReason) return 0;
  const share = line.usage.find((entry) => entry.recipeId === recipeId);
  if (!share) return 0;
  return line.totalPrice * (share.percent / 100);
}

export function productLineLeftoverValue(line: CartProductLine) {
  if (line.missingReason || line.leftoverPercent <= 0) return 0;
  return line.totalPrice * (line.leftoverPercent / 100);
}

function mergeRecipeValues(target: Map<string, number>, source: Map<string, number>) {
  for (const [recipeId, value] of source) {
    target.set(recipeId, (target.get(recipeId) ?? 0) + value);
  }
}

export function buildUsageShares(
  demands: IngredientDemand[],
  remainingByRecipeId: Map<string, number>,
  purchasedTotal: number,
  leftover: number,
): { usage: CartUsageShare[]; leftoverPercent: number } {
  if (purchasedTotal <= 0) {
    return { usage: [], leftoverPercent: 0 };
  }

  const usage = demands
    .map((demand) => {
      const remaining = remainingByRecipeId.get(demand.recipeId) ?? 0;
      return {
        recipeId: demand.recipeId,
        recipeName: demand.recipeName,
        percent: (remaining / purchasedTotal) * 100,
      };
    })
    .filter((entry) => entry.percent > 0.05);

  const leftoverPercent = (leftover / purchasedTotal) * 100;
  return normalizeUsageShares(usage, leftoverPercent);
}

export function normalizeUsageShares(usage: CartUsageShare[], leftoverPercent: number) {
  const entries = [
    ...usage,
    ...(leftoverPercent > 0.05 ? [{ recipeId: "leftover", recipeName: "Restes", percent: leftoverPercent }] : []),
  ];

  if (entries.length === 0) {
    return { usage: [], leftoverPercent: 0 };
  }

  const rounded = entries.map((entry) => ({
    ...entry,
    percent: Math.round(entry.percent * 10) / 10,
  }));

  const total = rounded.reduce((sum, entry) => sum + entry.percent, 0);
  const delta = Math.round((100 - total) * 10) / 10;
  if (delta !== 0 && rounded.length > 0) {
    const last = rounded[rounded.length - 1];
    last.percent = Math.round((last.percent + delta) * 10) / 10;
  }

  const recipeUsage = rounded.filter((entry) => entry.recipeId !== "leftover");
  const leftoverEntry = rounded.find((entry) => entry.recipeId === "leftover");

  return {
    usage: recipeUsage,
    leftoverPercent: leftoverEntry?.percent ?? 0,
  };
}

export function collectIngredientDemands(
  cartItems: CartRecipeEntry[],
  recipes: RecipeRecord[],
  ingredients: IngredientRecord[],
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
) {
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const demandsByIngredientId = new Map<string, IngredientDemand[]>();

  for (const cartItem of cartItems) {
    const recipe = recipeById.get(cartItem.recipeId);
    if (!recipe) continue;

    const estimates = estimateRecipeCosts(
      recipeToDraft(recipe),
      ingredients,
      cartItem.portions,
      globalRatios,
      units,
      new Map(),
      new Map(),
      false,
    );

    for (const estimate of estimates) {
      const current = demandsByIngredientId.get(estimate.ingredientId) ?? [];
      current.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        requiredBaseQuantity: estimate.requiredBaseQuantity,
      });
      demandsByIngredientId.set(estimate.ingredientId, current);
    }
  }

  return demandsByIngredientId;
}

type IngredientPurchaseContext = {
  stockByRecipeId: Map<string, number>;
  remainingByRecipeId: Map<string, number>;
  totalToPurchase: number;
  purchasePlan: PurchasePlan | null;
  purchaseLeftoverBase: number;
};

type IngredientBuildResult = {
  productLines: CartProductLine[];
  recipeStockValue: Map<string, number>;
  stockByRecipeId: Map<string, number>;
  remainingByRecipeId: Map<string, number>;
  purchaseLeftoverBase: number;
};

function computeIngredientPurchaseContext(
  demands: IngredientDemand[],
  stockAvailable: number,
  options: ProductOption[],
  applyStock: boolean,
): IngredientPurchaseContext {
  const totalRequired = demands.reduce((sum, demand) => sum + demand.requiredBaseQuantity, 0);
  const stockUsed = applyStock ? Math.min(stockAvailable, totalRequired) : 0;
  const stockByRecipeId = allocateStockProportionally(demands, stockUsed);
  const remainingByRecipeId = new Map(
    demands.map((demand) => [
      demand.recipeId,
      Math.max(0, demand.requiredBaseQuantity - (stockByRecipeId.get(demand.recipeId) ?? 0)),
    ]),
  );
  const totalToPurchase = Array.from(remainingByRecipeId.values()).reduce((sum, value) => sum + value, 0);

  if (totalToPurchase <= 0 || options.length === 0) {
    return {
      stockByRecipeId,
      remainingByRecipeId,
      totalToPurchase,
      purchasePlan: null,
      purchaseLeftoverBase: 0,
    };
  }

  const purchasePlan = optimizePurchase(totalToPurchase, options);
  return {
    stockByRecipeId,
    remainingByRecipeId,
    totalToPurchase,
    purchasePlan,
    purchaseLeftoverBase: purchasePlan?.leftover ?? 0,
  };
}

export function computeCartLeftoversByIngredient(
  cartItems: CartRecipeEntry[],
  recipes: RecipeRecord[],
  ingredients: IngredientRecord[],
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
  stockByIngredientId: Map<string, number>,
  excludeRecipeId?: string,
  applyStock = true,
) {
  const filteredItems = excludeRecipeId
    ? cartItems.filter((item) => item.recipeId !== excludeRecipeId)
    : cartItems;
  if (filteredItems.length === 0) {
    return new Map<string, number>();
  }

  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const demandsByIngredientId = collectIngredientDemands(
    filteredItems,
    recipes,
    ingredients,
    globalRatios,
    units,
  );
  const leftoversByIngredientId = new Map<string, number>();

  for (const [ingredientId, demands] of demandsByIngredientId) {
    const ingredient = ingredientById.get(ingredientId);
    if (!ingredient) continue;

    const options = productOptionsForIngredient(ingredient, globalRatios, units);
    const stockAvailable = stockByIngredientId.get(ingredientId) ?? 0;
    const context = computeIngredientPurchaseContext(demands, stockAvailable, options, applyStock);
    if (context.purchaseLeftoverBase > 0) {
      leftoversByIngredientId.set(ingredientId, context.purchaseLeftoverBase);
    }
  }

  return leftoversByIngredientId;
}

export function buildProductLinesForIngredient(
  ingredient: IngredientRecord,
  demands: IngredientDemand[],
  stockAvailable: number,
  options: ProductOption[],
  applyStock: boolean,
): IngredientBuildResult {
  const context = computeIngredientPurchaseContext(demands, stockAvailable, options, applyStock);
  const { stockByRecipeId, remainingByRecipeId, totalToPurchase, purchasePlan } = context;
  const stockUnitPrice = cheapestUnitPrice(options) ?? 0;
  const recipeStockValue = stockValueByRecipe(demands, stockByRecipeId, stockUnitPrice);

  if (totalToPurchase <= 0) {
    return {
      productLines: [],
      recipeStockValue,
      stockByRecipeId,
      remainingByRecipeId,
      purchaseLeftoverBase: 0,
    };
  }

  if (options.length === 0) {
    return {
      productLines: [
      {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        ingredientImageUrl: ingredientImageUrl(ingredient),
        product: {
          id: `missing-${ingredient.id}`,
          store: "",
          brand: null,
          name: "Produit indisponible",
          imageUrl: null,
          storageType: "FRESH",
          stockQuantity: null,
          packageQuantity: 0,
          packageUnitId: ingredient.baseUnitId,
          packageToBaseFactor: null,
          price: 0,
          url: null,
          barcode: null,
          notes: null,
          caloriesPer100g: null,
          proteinPer100g: null,
          carbsPer100g: null,
          fatPer100g: null,
          packageUnit: ingredient.baseUnit,
        },
        count: 0,
        totalBaseQuantity: totalToPurchase,
        unitPrice: 0,
        totalPrice: 0,
        baseUnit: ingredient.baseUnit,
        usage: [],
        leftoverPercent: 0,
        missingReason: "Aucun produit convertible",
      },
      ],
      recipeStockValue,
      stockByRecipeId,
      remainingByRecipeId,
      purchaseLeftoverBase: 0,
    };
  }

  if (purchasePlan === null) {
    return {
      productLines: [
      {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        ingredientImageUrl: ingredientImageUrl(ingredient),
        product: options[0].product,
        count: 0,
        totalBaseQuantity: totalToPurchase,
        unitPrice: options[0].unitPrice,
        totalPrice: 0,
        baseUnit: ingredient.baseUnit,
        usage: [],
        leftoverPercent: 0,
        missingReason: "Impossible d'optimiser l'achat",
      },
      ],
      recipeStockValue,
      stockByRecipeId,
      remainingByRecipeId,
      purchaseLeftoverBase: 0,
    };
  }

  const leftover = purchasePlan.leftover;
  const { usage, leftoverPercent } = buildUsageShares(
    demands,
    remainingByRecipeId,
    purchasePlan.totalBaseQuantity,
    leftover,
  );

  return {
    stockByRecipeId,
    remainingByRecipeId,
    purchaseLeftoverBase: leftover,
    productLines: purchasePlan.items.map((item) => {
      const option = options.find((entry) => entry.product.id === item.product.id);
      const unitPrice = option?.unitPrice ?? item.price / Math.max(item.baseQuantity, 1);

      return {
        ingredientId: ingredient.id,
        ingredientName: ingredient.name,
        ingredientImageUrl: ingredientImageUrl(ingredient),
        product: item.product,
        count: item.count,
        totalBaseQuantity: item.baseQuantity,
        unitPrice,
        totalPrice: item.price,
        baseUnit: ingredient.baseUnit,
        usage,
        leftoverPercent,
        missingReason: null,
      };
    }),
    recipeStockValue,
  };
}

export function computeCartPurchases(
  cartItems: CartRecipeEntry[],
  recipes: RecipeRecord[],
  ingredients: IngredientRecord[],
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
  stockByIngredientId: Map<string, number>,
  applyStock = true,
): CartPurchaseSummary {
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const demandsByIngredientId = collectIngredientDemands(
    cartItems,
    recipes,
    ingredients,
    globalRatios,
    units,
  );

  const recipePurchaseValue = new Map<string, number>();
  const recipeStockValue = new Map<string, number>();
  const productLines = Array.from(demandsByIngredientId.entries()).flatMap(([ingredientId, demands]) => {
    const ingredient = ingredientById.get(ingredientId);
    if (!ingredient) return [];

    const options = productOptionsForIngredient(ingredient, globalRatios, units);
    const stockAvailable = stockByIngredientId.get(ingredientId) ?? 0;
    const result = buildProductLinesForIngredient(ingredient, demands, stockAvailable, options, applyStock);
    mergeRecipeValues(recipeStockValue, result.recipeStockValue);

    for (const line of result.productLines) {
      for (const share of line.usage) {
        const current = recipePurchaseValue.get(share.recipeId) ?? 0;
        recipePurchaseValue.set(share.recipeId, current + recipeShareValue(line, share.recipeId));
      }
    }

    return result.productLines;
  });

  productLines.sort((left, right) => left.ingredientName.localeCompare(right.ingredientName, "fr"));

  const totalPrice = sumPartial(
    productLines.map((line) => (line.missingReason ? null : line.totalPrice)),
  );
  const leftoverValue = sumPartial(
    productLines.map((line) => (line.missingReason ? null : productLineLeftoverValue(line))),
  );

  const recipeLines = cartItems.flatMap((cartItem) => {
    const recipe = recipeById.get(cartItem.recipeId);
    if (!recipe) return [];

    const purchaseValue = recipePurchaseValue.get(recipe.id) ?? 0;
    const stockValue = recipeStockValue.get(recipe.id) ?? 0;
    const usedMerchandiseValue = purchaseValue + stockValue;

    return [
      {
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeImageUrl: recipe.imageUrl,
        portions: cartItem.portions,
        usedMerchandiseValue: usedMerchandiseValue > 0 ? usedMerchandiseValue : null,
      },
    ];
  });

  return {
    recipeLines,
    productLines,
    totalPrice,
    leftoverValue,
  };
}
