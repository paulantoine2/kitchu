"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/components/kitchu/use-cart";
import type { IngredientRecord, KitchuAppProps } from "@/components/kitchu/types";

export function useKitchuCart({
  ingredients,
  recipes,
  globalRatios,
  units,
  cartItems,
}: Pick<KitchuAppProps, "ingredients" | "recipes" | "globalRatios" | "units" | "cartItems"> & {
  ingredients: IngredientRecord[];
}) {
  const [cartOpen, setCartOpen] = useState(false);

  const stockByIngredientId = useMemo(
    () =>
      new Map(
        ingredients.flatMap((ingredient) =>
          ingredient.stock ? [[ingredient.id, ingredient.stock.quantity] as const] : [],
        ),
      ),
    [ingredients],
  );

  const cart = useCart({
    initialItems: cartItems,
    recipes,
    ingredients,
    globalRatios,
    units,
    stockByIngredientId,
  });

  return { cartOpen, setCartOpen, stockByIngredientId, cart };
}
