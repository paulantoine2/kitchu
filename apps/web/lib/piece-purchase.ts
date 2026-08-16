import type { IngredientRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";
import { effectiveToBaseFactor } from "@/lib/conversions";

export type PiecePurchaseProduct = IngredientRecord["products"][number];

export type PieceProductOption = {
  product: PiecePurchaseProduct;
  packageBaseQuantity: number;
  unitPrice: number;
  piecesPerPackage: number;
  pieceWeight: number;
};

export type PiecePurchasePlan = {
  totalBaseQuantity: number;
  totalPrice: number;
  leftover: number;
  items: Array<{
    product: PiecePurchaseProduct;
    count: number;
    baseQuantity: number;
    price: number;
  }>;
};

export function isCountUnit(unit?: UnitRecord | null) {
  return unit?.kind === "COUNT";
}

export function demandUsesPieces(demand: { requiredPieceCount?: number }) {
  return demand.requiredPieceCount !== undefined && demand.requiredPieceCount > 0;
}

export function ingredientDemandsUsePieces(demands: Array<{ requiredPieceCount?: number }>) {
  return demands.some(demandUsesPieces);
}

export function weightedRecipePieceWeight(
  demands: Array<{ requiredPieceCount?: number; recipePieceWeight?: number; requiredBaseQuantity: number }>,
) {
  const pieceDemands = demands.filter(demandUsesPieces);
  const totalPieces = pieceDemands.reduce((sum, demand) => sum + (demand.requiredPieceCount ?? 0), 0);
  if (totalPieces <= 0) return null;

  const totalBase = pieceDemands.reduce((sum, demand) => {
    const pieceCount = demand.requiredPieceCount ?? 0;
    const pieceWeight = demand.recipePieceWeight ?? demand.requiredBaseQuantity / pieceCount;
    return sum + pieceCount * pieceWeight;
  }, 0);

  return totalBase / totalPieces;
}

export function productPieceWeight(
  product: IngredientRecord["products"][number],
  ingredient: IngredientRecord,
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
) {
  if (!isCountUnit(product.packageUnit)) return null;

  const factor = effectiveToBaseFactor(
    product.packageUnit,
    ingredient.baseUnit,
    product.packageToBaseFactor,
    globalRatios,
    { allowSpecific: true, units },
  );
  if (!factor || !Number.isFinite(factor) || factor <= 0) return null;

  return factor;
}

export function pieceProductOptions(
  options: Array<{ product: PiecePurchaseProduct; packageBaseQuantity: number; unitPrice: number }>,
  ingredient: IngredientRecord,
  globalRatios: UnitRatioRecord[],
  units: UnitRecord[],
): PieceProductOption[] {
  return options.flatMap((option) => {
    const pieceWeight = productPieceWeight(option.product, ingredient, globalRatios, units);
    if (pieceWeight === null) return [];

    const piecesPerPackage = Math.max(1, Number(option.product.packageQuantity) || 1);

    return [{
      ...option,
      piecesPerPackage,
      pieceWeight,
    }];
  });
}

export function allocateStockPiecesProportionally(
  demands: Array<{ recipeId: string; requiredPieceCount?: number }>,
  stockAvailablePieces: number,
) {
  const totalRequired = demands.reduce((sum, demand) => sum + (demand.requiredPieceCount ?? 0), 0);
  const stockUsed = Math.min(stockAvailablePieces, totalRequired);
  const stockByRecipeId = new Map<string, number>();
  let allocated = 0;

  for (const [index, demand] of demands.entries()) {
    const required = demand.requiredPieceCount ?? 0;
    if (index === demands.length - 1) {
      stockByRecipeId.set(demand.recipeId, stockUsed - allocated);
      continue;
    }

    const share = totalRequired > 0 ? (required / totalRequired) * stockUsed : 0;
    stockByRecipeId.set(demand.recipeId, share);
    allocated += share;
  }

  return stockByRecipeId;
}

export function optimizePiecePurchase(
  requiredPieceCount: number,
  options: PieceProductOption[],
  requiredBaseQuantity: number,
): PiecePurchasePlan | null {
  if (!Number.isFinite(requiredPieceCount) || requiredPieceCount <= 0 || options.length === 0) {
    return null;
  }

  let best: PiecePurchasePlan | null = null;
  const counts = Array(options.length).fill(0) as number[];

  function considerPurchase(nextCounts: number[], purchasedPieces: number, totalPrice: number) {
    if (purchasedPieces < requiredPieceCount) return;

    const totalBaseQuantity = nextCounts.reduce(
      (sum, count, index) => sum + count * options[index].piecesPerPackage * options[index].pieceWeight,
      0,
    );
    const leftover = Math.max(0, totalBaseQuantity - requiredBaseQuantity);

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
          baseQuantity: count * options[index].piecesPerPackage * options[index].pieceWeight,
          price: count * options[index].product.price,
        }))
        .filter((item) => item.count > 0),
    };
  }

  for (const [index, option] of options.entries()) {
    const count = Math.ceil(requiredPieceCount / option.piecesPerPackage);
    const purchasedPieces = count * option.piecesPerPackage;
    considerPurchase(
      counts.map((value, countIndex) => (countIndex === index ? count : value)),
      purchasedPieces,
      count * option.product.price,
    );
  }

  function search(index: number, purchasedPieces: number, totalPrice: number) {
    if (best && totalPrice > best.totalPrice) return;
    if (purchasedPieces >= requiredPieceCount) {
      considerPurchase([...counts], purchasedPieces, totalPrice);
      return;
    }
    if (index >= options.length) return;

    const option = options[index];
    const maxByPieces = Math.ceil((requiredPieceCount - purchasedPieces) / option.piecesPerPackage) + 1;
    const maxByPrice = best ? Math.floor(best.totalPrice / option.product.price) + 1 : maxByPieces;
    const maxCount = Math.max(0, Math.min(maxByPieces, maxByPrice, 200));

    for (let count = 0; count <= maxCount; count += 1) {
      counts[index] = count;
      search(
        index + 1,
        purchasedPieces + count * option.piecesPerPackage,
        totalPrice + count * option.product.price,
      );
    }
    counts[index] = 0;
  }

  search(0, 0, 0);
  return best;
}

export function buildPieceSizeWarning(
  recipePieceWeight: number | null,
  productPieceWeight: number | null,
  baseUnitSymbol: string,
) {
  if (
    recipePieceWeight === null ||
    productPieceWeight === null ||
    Math.abs(recipePieceWeight - productPieceWeight) < 0.05
  ) {
    return null;
  }

  if (productPieceWeight > recipePieceWeight) {
    return `Pièce plus grande que dans la recette (${productPieceWeight} ${baseUnitSymbol} vs ${recipePieceWeight} ${baseUnitSymbol})`;
  }

  return `Pièce plus petite que dans la recette (${productPieceWeight} ${baseUnitSymbol} vs ${recipePieceWeight} ${baseUnitSymbol})`;
}
