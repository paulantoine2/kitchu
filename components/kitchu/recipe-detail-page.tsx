"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { KitchuShell } from "@/components/kitchu/kitchu-shell";
import { RecipeView } from "@/components/kitchu/recipe-view";
import { useKitchuCart } from "@/components/kitchu/use-kitchu-cart";
import type { KitchuAppProps, RecipeRecord } from "@/components/kitchu/types";
import { Button } from "@/components/ui/button";

export function RecipeDetailPage({
  recipe,
  ...props
}: KitchuAppProps & { recipe: RecipeRecord }) {
  const router = useRouter();
  const { cartOpen, setCartOpen, cart, stockByIngredientId } = useKitchuCart(props);
  const [portions, setPortions] = useState(cart.getPortions(recipe.id) ?? 2);

  return (
    <KitchuShell
      activeTab="recipes"
      cartOpen={cartOpen}
      onCartOpenChange={setCartOpen}
      cartItemCount={cart.itemCount}
      cartSummary={cart.summary}
      onCartPortionsChange={cart.setPortions}
      onCartRemoveRecipe={cart.remove}
    >
      <div className="mx-auto max-w-[1480px] px-4 py-8 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2"
          nativeButton={false}
          render={<Link href="/recipes" />}
        >
          <ArrowLeft data-icon="inline-start" />
          Retour aux recettes
        </Button>
        <RecipeView
          recipe={recipe}
          recipes={props.recipes}
          units={props.units}
          ingredients={props.ingredients}
          globalRatios={props.globalRatios}
          stockByIngredientId={stockByIngredientId}
          cartItems={cart.items}
          portions={portions}
          setPortions={setPortions}
          isInCart={cart.isInCart(recipe.id)}
          onCartAction={() => {
            cart.addOrUpdate(recipe.id, portions);
            setCartOpen(true);
          }}
          onEdit={() => router.push(`/recipes/${recipe.id}/edit`)}
        />
      </div>
    </KitchuShell>
  );
}
