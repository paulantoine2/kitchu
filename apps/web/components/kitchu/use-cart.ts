"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
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
  authenticated,
}: {
  initialItems: CartRecipeEntry[];
  recipes: RecipeRecord[];
  ingredients: IngredientRecord[];
  globalRatios: UnitRatioRecord[];
  units: UnitRecord[];
  stockByIngredientId: Map<string, number>;
  applyStock?: boolean;
  authenticated: boolean;
}) {
  const [items, setItems] = useState<CartRecipeEntry[]>(initialItems);

  const addOrUpdate = useCallback((recipeId: string, portions: number) => {
    if (!authenticated) {
      toast("Connectez-vous pour ajouter une recette au panier.", {
        action: { label: "Se connecter", onClick: () => window.location.assign("/connexion") },
      });
      return false;
    }
    let previous: CartRecipeEntry[] = [];
    setItems((current) => {
      previous = current;
      return addOrUpdateCartItem(current, recipeId, portions);
    });
    void upsertCartItem(recipeId, portions).then((result) => {
      if (!result.ok) {
        setItems(previous);
        toast.error(result.error);
      }
    });
    return true;
  }, [authenticated]);

  const remove = useCallback((recipeId: string) => {
    if (!authenticated) return;
    let previous: CartRecipeEntry[] = [];
    setItems((current) => {
      previous = current;
      return removeCartItem(current, recipeId);
    });
    void removeCartRecipe(recipeId).then((result) => {
      if (!result.ok) {
        setItems(previous);
        toast.error(result.error);
      }
    });
  }, [authenticated]);

  const setPortions = useCallback((recipeId: string, portions: number) => {
    if (!authenticated) return;
    let previous: CartRecipeEntry[] = [];
    setItems((current) => {
      previous = current;
      return updateCartItemPortions(current, recipeId, portions);
    });
    void upsertCartItem(recipeId, portions).then((result) => {
      if (!result.ok) {
        setItems(previous);
        toast.error(result.error);
      }
    });
  }, [authenticated]);

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
