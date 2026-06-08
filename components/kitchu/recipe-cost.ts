import {
  convertToBase,
  effectiveToBaseFactor,
  globalConversionFactor,
  scaleQuantity,
} from "@/lib/conversions";
import { formatCurrency } from "@/lib/utils";
import { ingredientImageUrl } from "@/components/kitchu/images";
import type { IngredientRecord, RecipeDraft, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";
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
  toPurchaseBaseQuantity: number;
  theoreticalPrice: number | null;
  cheapestProduct: ProductOption | null;
  purchasePlan: PurchasePlan | null;
  missingReason: string | null;
};
export function estimateRecipeCosts(
  draft: RecipeDraft,
  ingredients: IngredientRecord[],
  portions: number,
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
  stockByIngredientId: Map<string, number> = new Map(),
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
    const cheapestProduct = options.reduce<ProductOption | null>(
      (best, option) => (!best || option.unitPrice < best.unitPrice ? option : best),
      null,
    );
    const stockAvailable = stockByIngredientId.get(ingredient.id) ?? 0;
    const stockUsed = applyStock ? Math.min(stockAvailable, requiredBaseQuantity) : 0;
    const toPurchaseBaseQuantity = applyStock
      ? Math.max(0, requiredBaseQuantity - stockUsed)
      : requiredBaseQuantity;
    const purchasePlan =
      toPurchaseBaseQuantity > 0 ? optimizePurchase(toPurchaseBaseQuantity, options) : null;

    return {
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      ingredientImageUrl: ingredientImageUrl(ingredient),
      baseUnit: ingredient.baseUnit,
      requiredBaseQuantity,
      stockAvailable,
      stockUsed,
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
  });
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

export function optimizePurchase(requiredBaseQuantity: number, options: ProductOption[]) {
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
