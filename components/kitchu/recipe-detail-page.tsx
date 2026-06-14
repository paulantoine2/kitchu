"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
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
      cartOpen={cartOpen}
      onCartOpenChange={setCartOpen}
      cartItemCount={cart.itemCount}
      cartSummary={cart.summary}
      onCartPortionsChange={cart.setPortions}
      onCartRemoveRecipe={cart.remove}
    >
      <div className="mx-auto max-w-[1120px] px-4 py-8 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ml-2"
            nativeButton={false}
            render={<Link href="/recipes" />}
          >
            <ArrowLeft data-icon="inline-start" />
            Retour aux recettes
          </Button>
          <Button
            size="sm"
            onClick={() => router.push(`/recipes/${recipe.id}/edit`)}
          >
            <Pencil data-icon="inline-start" />
            Modifier
          </Button>
        </div>
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
        />
      </div>
    </KitchuShell>
  );
}
