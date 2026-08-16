"use client";

import { useKitchuRouter } from "@/components/use-kitchu-router";
import { KitchuShell } from "@/components/kitchu/kitchu-shell";
import { RecipeList } from "@/components/kitchu/recipe-list";
import { useKitchuCart } from "@/components/kitchu/use-kitchu-cart";
import type { KitchuAppProps } from "@/components/kitchu/types";

export function RecipesListPage(props: KitchuAppProps) {
  const router = useKitchuRouter();
  const { cartOpen, setCartOpen, stockByIngredientId, cart } = useKitchuCart(props);

  return (
    <KitchuShell
      cartOpen={cartOpen}
      onCartOpenChange={setCartOpen}
      cartItemCount={cart.itemCount}
      cartSummary={cart.summary}
      viewer={props.viewer}
      onCartPortionsChange={cart.setPortions}
      onCartRemoveRecipe={cart.remove}
    >
      <RecipeList
        recipes={props.recipes}
        allRecipes={props.recipes}
        ingredients={props.ingredients}
        globalRatios={props.globalRatios}
        units={props.units}
        stockByIngredientId={stockByIngredientId}
        cartItems={cart.items}
        isInCart={cart.isInCart}
        onAddToCart={(recipeId, portions) => {
          if (cart.addOrUpdate(recipeId, portions)) setCartOpen(true);
        }}
        onNewRecipe={props.viewer?.role === "ADMIN" ? () => router.push("/recipes/new") : undefined}
      />
    </KitchuShell>
  );
}
