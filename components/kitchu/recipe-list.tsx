"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search, ShoppingCart } from "lucide-react";
import { recipeImageUrl } from "@/components/kitchu/images";
import {
  computeRecipeListPrice,
  type RecipeListPriceMode,
} from "@/components/kitchu/recipe-cost";
import type { CartRecipeEntry, IngredientRecord, RecipeRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn, formatCurrency } from "@/lib/utils";

const DEFAULT_LIST_PORTIONS = 2;

function RecipeCard({
  recipe,
  priceMode,
  pricePerPortion,
  priceComplete,
  isInCart,
  onAddToCart,
}: {
  recipe: RecipeRecord;
  priceMode: RecipeListPriceMode;
  pricePerPortion: number | null;
  priceComplete: boolean;
  isInCart: boolean;
  onAddToCart: () => void;
}) {
  const imageUrl = recipeImageUrl(recipe);
  const totalMinutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`/recipes/${recipe.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-primary/10">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={recipe.name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-4xl font-semibold text-primary">
              {recipe.name.trim().charAt(0).toUpperCase() || "K"}
            </div>
          )}
          {isInCart && (
            <Badge className="absolute top-2 right-2 shadow-sm">Dans le panier</Badge>
          )}
        </div>
        <CardContent className="pt-3">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug">{recipe.name}</h3>
          {totalMinutes > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">{totalMinutes} min</p>
          )}
          <div className="mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {priceMode === "theoretical" ? "Prix théorique" : "Prix d'achat"}
            </p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums">
              {pricePerPortion !== null ? (
                <>
                  {formatCurrency(pricePerPortion)}
                  <span className="text-sm font-medium text-muted-foreground">/portion</span>
                </>
              ) : (
                "—"
              )}
            </p>
            {!priceComplete && pricePerPortion !== null && (
              <p className="mt-0.5 text-xs text-muted-foreground">Estimation partielle</p>
            )}
          </div>
        </CardContent>
      </Link>
      <CardFooter className="border-t bg-muted/30">
        <Button
          size="sm"
          variant={isInCart ? "secondary" : "default"}
          className="w-full"
          onClick={(event) => {
            event.preventDefault();
            onAddToCart();
          }}
        >
          <ShoppingCart data-icon="inline-start" />
          {isInCart ? "Ajuster le panier" : "Ajouter au panier"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function RecipeList({
  recipes,
  allRecipes,
  ingredients,
  globalRatios,
  units,
  stockByIngredientId,
  cartItems,
  isInCart,
  getCartPortions,
  onAddToCart,
  onNewRecipe,
}: {
  recipes: RecipeRecord[];
  allRecipes: RecipeRecord[];
  ingredients: IngredientRecord[];
  globalRatios: UnitRatioRecord[];
  units: UnitRecord[];
  stockByIngredientId: Map<string, number>;
  cartItems: CartRecipeEntry[];
  isInCart: (recipeId: string) => boolean;
  getCartPortions: (recipeId: string) => number | undefined;
  onAddToCart: (recipeId: string, portions: number) => void;
  onNewRecipe: () => void;
}) {
  const [search, setSearch] = useState("");
  const [priceMode, setPriceMode] = useState<RecipeListPriceMode>("purchase");

  const filteredRecipes = useMemo(
    () =>
      recipes.filter((recipe) =>
        recipe.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [recipes, search],
  );

  const priceByRecipeId = useMemo(() => {
    const entries = new Map<string, { perPortion: number | null; isComplete: boolean }>();
    for (const recipe of filteredRecipes) {
      const portions = getCartPortions(recipe.id) ?? DEFAULT_LIST_PORTIONS;
      const summary = computeRecipeListPrice({
        recipe,
        portions,
        ingredients,
        globalRatios,
        units,
        stockByIngredientId,
        cartItems,
        isInCart: isInCart(recipe.id),
        recipes: allRecipes,
        priceMode,
      });
      entries.set(recipe.id, {
        perPortion: summary.perPortion,
        isComplete: summary.isComplete,
      });
    }
    return entries;
  }, [
    filteredRecipes,
    ingredients,
    globalRatios,
    units,
    stockByIngredientId,
    cartItems,
    isInCart,
    allRecipes,
    priceMode,
    getCartPortions,
  ]);

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Recettes</h2>
          <p className="text-sm text-muted-foreground">
            {filteredRecipes.length} recette{filteredRecipes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onNewRecipe} className="shrink-0 self-start sm:self-auto">
          <Plus data-icon="inline-start" />
          Nouvelle recette
        </Button>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <InputGroup className="flex-1 rounded-full">
          <InputGroupAddon align="inline-start">
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une recette"
          />
        </InputGroup>

        <div className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
          <Label
            htmlFor="price-mode-toggle"
            className={cn(
              "cursor-pointer text-sm font-medium",
              priceMode === "theoretical" ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Théorique
          </Label>
          <Switch
            id="price-mode-toggle"
            checked={priceMode === "purchase"}
            onCheckedChange={(checked) => setPriceMode(checked ? "purchase" : "theoretical")}
            aria-label="Basculer entre prix théorique et prix d'achat"
          />
          <Label
            htmlFor="price-mode-toggle"
            className={cn(
              "cursor-pointer text-sm font-medium",
              priceMode === "purchase" ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Achat
          </Label>
        </div>
      </div>

      {filteredRecipes.length === 0 ? (
        <Empty className="border-border bg-card">
          <EmptyDescription>
            {search ? "Aucune recette ne correspond à votre recherche." : "Aucune recette pour le moment."}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredRecipes.map((recipe) => {
            const price = priceByRecipeId.get(recipe.id);
            return (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                priceMode={priceMode}
                pricePerPortion={price?.perPortion ?? null}
                priceComplete={price?.isComplete ?? false}
                isInCart={isInCart(recipe.id)}
                onAddToCart={() =>
                  onAddToCart(recipe.id, getCartPortions(recipe.id) ?? DEFAULT_LIST_PORTIONS)
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
