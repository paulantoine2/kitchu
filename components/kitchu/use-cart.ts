"use client";

import { useCallback, useMemo, useState } from "react";
import { removeCartRecipe, upsertCartItem } from "@/app/actions";
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
  initialItems,
  recipes,
  ingredients,
  globalRatios,
  units,
  stockByIngredientId,
  applyStock = true,
}: {
  initialItems: CartRecipeEntry[];
  recipes: RecipeRecord[];
  ingredients: IngredientRecord[];
  globalRatios: UnitRatioRecord[];
  units: UnitRecord[];
  stockByIngredientId: Map<string, number>;
  applyStock?: boolean;
}) {
  const [items, setItems] = useState<CartRecipeEntry[]>(initialItems);

  const addOrUpdate = useCallback((recipeId: string, portions: number) => {
    setItems((current) => {
      const next = addOrUpdateCartItem(current, recipeId, portions);
      void upsertCartItem(recipeId, portions);
      return next;
    });
  }, []);

  const remove = useCallback((recipeId: string) => {
    setItems((current) => {
      const next = removeCartItem(current, recipeId);
      void removeCartRecipe(recipeId);
      return next;
    });
  }, []);

  const setPortions = useCallback((recipeId: string, portions: number) => {
    setItems((current) => {
      const next = updateCartItemPortions(current, recipeId, portions);
      void upsertCartItem(recipeId, portions);
      return next;
    });
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
