"use client";

import { useKitchuRouter } from "@/components/use-kitchu-router";
import { IngredientList } from "@/components/kitchu/ingredient-list";
import { KitchuShell } from "@/components/kitchu/kitchu-shell";
import { useKitchuCart } from "@/components/kitchu/use-kitchu-cart";
import type { KitchuAppProps } from "@/components/kitchu/types";

export function IngredientsListPage(props: KitchuAppProps) {
  const router = useKitchuRouter();
  const { cartOpen, setCartOpen, cart } = useKitchuCart(props);

  return (
    <KitchuShell
      cartOpen={cartOpen}
      onCartOpenChange={setCartOpen}
      cartItemCount={cart.itemCount}
      cartSummary={cart.summary}
      onCartPortionsChange={cart.setPortions}
      onCartRemoveRecipe={cart.remove}
    >
      <IngredientList
        ingredients={props.ingredients}
        onNewIngredient={() => router.push("/ingredients/new")}
      />
    </KitchuShell>
  );
}
