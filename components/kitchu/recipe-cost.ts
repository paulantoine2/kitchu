import {
  convertToBase,
  effectiveToBaseFactor,
  globalConversionFactor,
  scaleQuantity,
} from "@/lib/conversions";
import { formatCurrency } from "@/lib/utils";
import {
  buildProductLinesForIngredient,
  collectIngredientDemands,
  computeCartLeftoversByIngredient,
  recipeShareValue,
  type CartRecipeEntry,
} from "@/components/kitchu/cart";
import { recipeToDraft } from "@/components/kitchu/drafts";
import { ingredientImageUrl } from "@/components/kitchu/images";
import type { IngredientRecord, RecipeDraft, RecipeRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";
import { usableUnitsForIngredient } from "@/components/kitchu/unit-helpers";
import { standardUnitForPrice } from "@/components/kitchu/utils";

export type ProductOption = {
  product: IngredientRecord["products"][number];
  packageBaseQuantity: number;
  unitPrice: number;
};

export type PurchasePlan = {
  totalBaseQuantity: number;
  totalPrice: number;
  leftover: number;
  items: Array<{ product: IngredientRecord["products"][number]; count: number; baseQuantity: number; price: number }>;
};

export type RecipeCostEstimate = {
  ingredientId: string;
  ingredientName: string;
  ingredientImageUrl: string | null;
  baseUnit: UnitRecord;
  requiredBaseQuantity: number;
  stockAvailable: number;
  stockUsed: number;
  cartLeftoverAvailable: number;
  cartLeftoverUsed: number;
  toPurchaseBaseQuantity: number;
  theoreticalPrice: number | null;
  cheapestProduct: ProductOption | null;
  purchasePlan: PurchasePlan | null;
  missingReason: string | null;
};

function buildRecipeCostEstimate({
  ingredient,
  requiredBaseQuantity,
  stockAvailable,
  stockUsed,
  cartLeftoverAvailable,
  cartLeftoverUsed,
  toPurchaseBaseQuantity,
  options,
  purchasePlan,
}: {
  ingredient: IngredientRecord;
  requiredBaseQuantity: number;
  stockAvailable: number;
  stockUsed: number;
  cartLeftoverAvailable: number;
  cartLeftoverUsed: number;
  toPurchaseBaseQuantity: number;
  options: ProductOption[];
  purchasePlan: PurchasePlan | null;
}): RecipeCostEstimate {
  const cheapestProduct = options.reduce<ProductOption | null>(
    (best, option) => (!best || option.unitPrice < best.unitPrice ? option : best),
    null,
  );

  return {
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    ingredientImageUrl: ingredientImageUrl(ingredient),
    baseUnit: ingredient.baseUnit,
    requiredBaseQuantity,
    stockAvailable,
    stockUsed,
    cartLeftoverAvailable,
    cartLeftoverUsed,
    toPurchaseBaseQuantity,
    theoreticalPrice:
      toPurchaseBaseQuantity > 0 && cheapestProduct
        ? toPurchaseBaseQuantity * cheapestProduct.unitPrice
        : toPurchaseBaseQuantity === 0
          ? 0
          : null,
    cheapestProduct,
    purchasePlan,
    missingReason: options.length ? null : "Aucun produit convertible",
  };
}

export function estimateRecipeCosts(
  draft: RecipeDraft,
  ingredients: IngredientRecord[],
  portions: number,
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
  stockByIngredientId: Map<string, number> = new Map(),
  cartLeftoversByIngredientId: Map<string, number> = new Map(),
  applyStock = true,
) {
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const totals = new Map<string, { ingredient: IngredientRecord; requiredBaseQuantity: number }>();

  for (const row of draft.ingredients) {
    const ingredient = ingredientById.get(row.ingredientId);
    if (!ingredient) continue;

    const allowedUnit = usableUnitsForIngredient(ingredient, units, globalRatios).find(
      (unit) => unit.unitId === row.unitId,
    );
    const perServingBaseQuantity = convertToBase(
      Number(row.quantityPerServing),
      effectiveToBaseFactor(allowedUnit?.unit, ingredient.baseUnit, allowedUnit?.toBaseFactor, globalRatios, {
        allowSpecific: true,
        units,
      }),
    );
    if (!perServingBaseQuantity) continue;

    const current = totals.get(ingredient.id) ?? { ingredient, requiredBaseQuantity: 0 };
    current.requiredBaseQuantity += scaleQuantity(perServingBaseQuantity, portions);
    totals.set(ingredient.id, current);
  }

  return Array.from(totals.values()).map(({ ingredient, requiredBaseQuantity }) => {
    const options = productOptionsForIngredient(ingredient, globalRatios, units);
    const stockAvailable = stockByIngredientId.get(ingredient.id) ?? 0;
    const stockUsed = applyStock ? Math.min(stockAvailable, requiredBaseQuantity) : 0;
    const afterStock = Math.max(0, requiredBaseQuantity - stockUsed);
    const cartLeftoverAvailable = cartLeftoversByIngredientId.get(ingredient.id) ?? 0;
    const cartLeftoverUsed = applyStock ? Math.min(cartLeftoverAvailable, afterStock) : 0;
    const toPurchaseBaseQuantity = applyStock
      ? Math.max(0, afterStock - cartLeftoverUsed)
      : requiredBaseQuantity;
    const purchasePlan =
      toPurchaseBaseQuantity > 0 ? optimizePurchase(toPurchaseBaseQuantity, options) : null;

    return buildRecipeCostEstimate({
      ingredient,
      requiredBaseQuantity,
      stockAvailable,
      stockUsed,
      cartLeftoverAvailable,
      cartLeftoverUsed,
      toPurchaseBaseQuantity,
      options,
      purchasePlan,
    });
  });
}

function estimateRecipeCostsFromCart({
  recipeId,
  portions,
  cartItems,
  recipes,
  ingredients,
  globalRatios,
  units,
  stockByIngredientId,
  applyStock,
}: {
  recipeId: string;
  portions: number;
  cartItems: CartRecipeEntry[];
  recipes: RecipeRecord[];
  ingredients: IngredientRecord[];
  globalRatios: UnitRatioRecord[];
  units: UnitRecord[];
  stockByIngredientId: Map<string, number>;
  applyStock: boolean;
}) {
  const recipe = recipes.find((entry) => entry.id === recipeId);
  if (!recipe) return [];

  const adjustedCart = cartItems.map((item) =>
    item.recipeId === recipeId ? { ...item, portions } : item,
  );
  const demandsByIngredientId = collectIngredientDemands(
    adjustedCart,
    recipes,
    ingredients,
    globalRatios,
    units,
  );
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const baseEstimates = estimateRecipeCosts(
    recipeToDraft(recipe),
    ingredients,
    portions,
    globalRatios,
    units,
    stockByIngredientId,
    new Map(),
    false,
  );

  return baseEstimates.map((baseEstimate) => {
    const demands = demandsByIngredientId.get(baseEstimate.ingredientId) ?? [];
    const ingredient = ingredientById.get(baseEstimate.ingredientId);
    if (!ingredient || demands.length === 0) {
      return baseEstimate;
    }

    const options = productOptionsForIngredient(ingredient, globalRatios, units);
    const stockAvailable = stockByIngredientId.get(ingredient.id) ?? 0;
    const result = buildProductLinesForIngredient(
      ingredient,
      demands,
      stockAvailable,
      options,
      applyStock,
    );
    const stockUsed = result.stockByRecipeId.get(recipeId) ?? 0;
    const purchasedBaseQuantity = result.remainingByRecipeId.get(recipeId) ?? 0;
    const cartLeftoverAvailable = 0;
    const cartLeftoverUsed = 0;
    const purchasePrice = result.productLines.reduce(
      (sum, line) => sum + recipeShareValue(line, recipeId),
      0,
    );
    const purchaseLeftoverShare = result.productLines.reduce((sum, line) => {
      if (line.missingReason || line.leftoverPercent <= 0) return sum;
      const recipeShare = line.usage.find((entry) => entry.recipeId === recipeId);
      if (!recipeShare) return sum;
      const lineLeftoverBase = line.totalBaseQuantity * (line.leftoverPercent / 100);
      return sum + lineLeftoverBase * (recipeShare.percent / 100);
    }, 0);

    const purchasePlan: PurchasePlan | null =
      purchasePrice > 0
        ? {
            totalBaseQuantity: purchasedBaseQuantity,
            totalPrice: purchasePrice,
            leftover: purchaseLeftoverShare,
            items: result.productLines
              .filter((line) => !line.missingReason && recipeShareValue(line, recipeId) > 0)
              .map((line) => {
                const share = line.usage.find((entry) => entry.recipeId === recipeId);
                const shareRatio = (share?.percent ?? 0) / 100;
                return {
                  product: line.product,
                  count: line.count,
                  baseQuantity: line.totalBaseQuantity * shareRatio,
                  price: recipeShareValue(line, recipeId),
                };
              }),
          }
        : null;

    return buildRecipeCostEstimate({
      ingredient,
      requiredBaseQuantity: baseEstimate.requiredBaseQuantity,
      stockAvailable,
      stockUsed,
      cartLeftoverAvailable,
      cartLeftoverUsed,
      toPurchaseBaseQuantity: purchasedBaseQuantity,
      options,
      purchasePlan,
    });
  });
}

export function estimateRecipeViewCosts({
  recipe,
  portions,
  ingredients,
  globalRatios,
  units,
  stockByIngredientId,
  cartItems,
  isInCart,
  applyStock,
  recipes,
}: {
  recipe: RecipeRecord;
  portions: number;
  ingredients: IngredientRecord[];
  globalRatios: UnitRatioRecord[];
  units: UnitRecord[];
  stockByIngredientId: Map<string, number>;
  cartItems: CartRecipeEntry[];
  isInCart: boolean;
  applyStock: boolean;
  recipes: RecipeRecord[];
}) {
  if (!applyStock) {
    return estimateRecipeCosts(
      recipeToDraft(recipe),
      ingredients,
      portions,
      globalRatios,
      units,
      stockByIngredientId,
      new Map(),
      false,
    );
  }

  if (isInCart) {
    return estimateRecipeCostsFromCart({
      recipeId: recipe.id,
      portions,
      cartItems,
      recipes,
      ingredients,
      globalRatios,
      units,
      stockByIngredientId,
      applyStock: true,
    });
  }

  const cartLeftoversByIngredientId = computeCartLeftoversByIngredient(
    cartItems,
    recipes,
    ingredients,
    globalRatios,
    units,
    stockByIngredientId,
    undefined,
    applyStock,
  );

  return estimateRecipeCosts(
    recipeToDraft(recipe),
    ingredients,
    portions,
    globalRatios,
    units,
    stockByIngredientId,
    cartLeftoversByIngredientId,
    applyStock,
  );
}

export function productOptionsForIngredient(
  ingredient: IngredientRecord,
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
) {
  return ingredient.products
    .map((product) => {
      const factor = effectiveToBaseFactor(
        product.packageUnit,
        ingredient.baseUnit,
        product.packageToBaseFactor,
        globalRatios,
        { allowSpecific: true, units },
      );
      const packageBaseQuantity = Number(product.packageQuantity) * (factor ?? 0);
      if (!factor || !Number.isFinite(packageBaseQuantity) || packageBaseQuantity <= 0 || product.price < 0) {
        return null;
      }

      return {
        product,
        packageBaseQuantity,
        unitPrice: product.price / packageBaseQuantity,
      };
    })
    .filter((option): option is ProductOption => Boolean(option));
}

export function formatCheapestProductRatio(
  estimate: RecipeCostEstimate,
  units: UnitRecord[],
  globalRatios: UnitRatioRecord[],
) {
  if (!estimate.cheapestProduct) return "Indisponible";

  const standardUnit = standardUnitForPrice(estimate.baseUnit, units);
  const standardFactor = globalConversionFactor(standardUnit, estimate.baseUnit, globalRatios, units);
  const displayUnit = standardFactor !== null && standardUnit ? standardUnit : estimate.baseUnit;
  const displayPrice = standardFactor !== null
    ? estimate.cheapestProduct.unitPrice * standardFactor
    : estimate.cheapestProduct.unitPrice;

  return `${estimate.cheapestProduct.product.name} (${formatCurrency(displayPrice)} / ${displayUnit.symbol})`;
}

export function optimizePurchase(requiredBaseQuantity: number, options: ProductOption[]): PurchasePlan | null {
  if (!Number.isFinite(requiredBaseQuantity) || requiredBaseQuantity <= 0 || options.length === 0) return null;

  let best: PurchasePlan | null = null;
  const counts = Array(options.length).fill(0) as number[];

  for (const [index, option] of options.entries()) {
    const count = Math.ceil(requiredBaseQuantity / option.packageBaseQuantity);
    const totalBaseQuantity = count * option.packageBaseQuantity;
    considerPurchase(counts.map((value, countIndex) => (countIndex === index ? count : value)), totalBaseQuantity, count * option.product.price);
  }

  function considerPurchase(nextCounts: number[], totalBaseQuantity: number, totalPrice: number) {
    if (totalBaseQuantity < requiredBaseQuantity) return;
    const leftover = totalBaseQuantity - requiredBaseQuantity;
    if (
      best &&
      (totalPrice > best.totalPrice ||
        (Math.abs(totalPrice - best.totalPrice) < 0.000001 && leftover >= best.leftover))
    ) {
      return;
    }

    best = {
      totalBaseQuantity,
      totalPrice,
      leftover,
      items: nextCounts
        .map((count, index) => ({
          product: options[index].product,
          count,
          baseQuantity: count * options[index].packageBaseQuantity,
          price: count * options[index].product.price,
        }))
        .filter((item) => item.count > 0),
    };
  }

  function search(index: number, totalBaseQuantity: number, totalPrice: number) {
    if (best && totalPrice > best.totalPrice) return;
    if (totalBaseQuantity >= requiredBaseQuantity) {
      considerPurchase([...counts], totalBaseQuantity, totalPrice);
      return;
    }
    if (index >= options.length) return;

    const option = options[index];
    const maxByQuantity = Math.ceil((requiredBaseQuantity - totalBaseQuantity) / option.packageBaseQuantity) + 1;
    const maxByPrice = best ? Math.floor(best.totalPrice / option.product.price) + 1 : maxByQuantity;
    const maxCount = Math.max(0, Math.min(maxByQuantity, maxByPrice, 200));

    for (let count = 0; count <= maxCount; count += 1) {
      counts[index] = count;
      search(
        index + 1,
        totalBaseQuantity + count * option.packageBaseQuantity,
        totalPrice + count * option.product.price,
      );
    }
    counts[index] = 0;
  }

  search(0, 0, 0);
  return best;
}

export function sumNullable(values: Array<number | null>) {
  if (values.some((value) => value === null)) return null;
  return (values as number[]).reduce((total, value) => total + value, 0);
}

export type PartialSum = {
  total: number | null;
  isComplete: boolean;
};

export function estimatePurchaseTotal(estimate: RecipeCostEstimate): number | null {
  if (estimate.toPurchaseBaseQuantity === 0) return 0;
  const plan = estimate.purchasePlan;
  if (!plan) return null;
  return plan.totalPrice;
}

export function sumPartial(values: Array<number | null>): PartialSum {
  const available = values.filter((value): value is number => value !== null);
  if (available.length === 0) {
    return { total: null, isComplete: false };
  }
  return {
    total: available.reduce((sum, value) => sum + value, 0),
    isComplete: available.length === values.length,
  };
}

export type RecipeListPriceMode = "theoretical" | "purchase";

export type RecipeListPriceSummary = {
  perPortion: number | null;
  total: number | null;
  isComplete: boolean;
};

export function computeRecipeListPrice({
  recipe,
  portions,
  ingredients,
  globalRatios,
  units,
  stockByIngredientId,
  cartItems,
  isInCart,
  recipes,
  priceMode,
}: {
  recipe: RecipeRecord;
  portions: number;
  ingredients: IngredientRecord[];
  globalRatios: UnitRatioRecord[];
  units: UnitRecord[];
  stockByIngredientId: Map<string, number>;
  cartItems: CartRecipeEntry[];
  isInCart: boolean;
  recipes: RecipeRecord[];
  priceMode: RecipeListPriceMode;
}): RecipeListPriceSummary {
  const estimates = estimateRecipeViewCosts({
    recipe,
    portions,
    ingredients,
    globalRatios,
    units,
    stockByIngredientId,
    cartItems,
    isInCart,
    applyStock: true,
    recipes,
  });

  const values =
    priceMode === "theoretical"
      ? estimates.map((estimate) => estimate.theoreticalPrice)
      : estimates.map(estimatePurchaseTotal);
  const sum = sumPartial(values);
  const portionCount = Math.max(1, portions);

  return {
    perPortion: sum.total !== null ? sum.total / portionCount : null,
    total: sum.total,
    isComplete: sum.isComplete,
  };
}
