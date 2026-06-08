"use client";

import { useCallback, useMemo, useState } from "react";
import {
  addOrUpdateCartItem,
  computeCartPurchases,
  getCartItem,
  removeCartItem,
  updateCartItemPortions,
  type CartRecipeEntry,
} from "@/components/kitchu/cart";
import type { IngredientRecord, RecipeRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";

export function useCart({
  recipes,
  ingredients,
  globalRatios,
  units,
  stockByIngredientId,
  applyStock = true,
}: {
  recipes: RecipeRecord[];
  ingredients: IngredientRecord[];
  globalRatios: UnitRatioRecord[];
  units: UnitRecord[];
  stockByIngredientId: Map<string, number>;
  applyStock?: boolean;
}) {
  const [items, setItems] = useState<CartRecipeEntry[]>([]);

  const addOrUpdate = useCallback((recipeId: string, portions: number) => {
    setItems((current) => addOrUpdateCartItem(current, recipeId, portions));
  }, []);

  const remove = useCallback((recipeId: string) => {
    setItems((current) => removeCartItem(current, recipeId));
  }, []);

  const setPortions = useCallback((recipeId: string, portions: number) => {
    setItems((current) => updateCartItemPortions(current, recipeId, portions));
  }, []);

  const isInCart = useCallback((recipeId: string) => Boolean(getCartItem(items, recipeId)), [items]);

  const summary = useMemo(
    () => computeCartPurchases(items, recipes, ingredients, globalRatios, units, stockByIngredientId, applyStock),
    [items, recipes, ingredients, globalRatios, units, stockByIngredientId, applyStock],
  );

  return {
    items,
    itemCount: items.length,
    addOrUpdate,
    remove,
    setPortions,
    isInCart,
    getPortions: (recipeId: string) => getCartItem(items, recipeId)?.portions,
    summary,
  };
}
