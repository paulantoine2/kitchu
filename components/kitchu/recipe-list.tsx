"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search, ShoppingCart } from "lucide-react";
import { ingredientImageUrl, recipeImageUrl } from "@/components/kitchu/images";
import {
  computeRecipeListMatch,
  computeRecipeListPrice,
  type RecipeListPriceMode,
} from "@/components/kitchu/recipe-cost";
import { RecipeMatchGauge } from "@/components/kitchu/recipe-match-gauge";
import type { CartRecipeEntry, IngredientRecord, RecipeRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";
import { EntityImage, Field } from "@/components/kitchu/ui/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { cn, formatCurrency } from "@/lib/utils";

const DEFAULT_LIST_PORTIONS = 2;

type RecipeListSortMode = "match" | "alphabetical" | "price";

function isRecipeListSortMode(value: string): value is RecipeListSortMode {
  return value === "match" || value === "alphabetical" || value === "price";
}

function RecipeCard({
  recipe,
  priceMode,
  pricePerPortion,
  priceComplete,
  matchPercent,
  isInCart,
  onAddToCart,
}: {
  recipe: RecipeRecord;
  priceMode: RecipeListPriceMode;
  pricePerPortion: number | null;
  priceComplete: boolean;
  matchPercent: number | null;
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
          {isInCart ? (
            <Badge className="absolute top-2 left-2 shadow-md">Dans le panier</Badge>
          ) : (
            matchPercent !== null && (
              <div className="absolute top-2 left-2">
                <RecipeMatchGauge percent={matchPercent} size={44} framed />
              </div>
            )
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
              <Badge variant="outline" className="mt-2 text-[10px] text-muted-foreground">
                Estimation partielle
              </Badge>
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
  onAddToCart: (recipeId: string, portions: number) => void;
  onNewRecipe: () => void;
}) {
  const [selectedIngredients, setSelectedIngredients] = useState<IngredientRecord[]>([]);
  const [sortMode, setSortMode] = useState<RecipeListSortMode>("match");
  const [priceMode, setPriceMode] = useState<RecipeListPriceMode>("purchase");
  const [listPortions, setListPortions] = useState(DEFAULT_LIST_PORTIONS);
  const comboboxAnchorRef = useComboboxAnchor();
  const portionCount = Math.max(1, listPortions);

  const recipeIngredientOptions = useMemo(() => {
    const usedIngredientIds = new Set<string>();
    for (const recipe of recipes) {
      for (const item of recipe.ingredients) {
        usedIngredientIds.add(item.ingredientId);
      }
    }
    return ingredients
      .filter((ingredient) => usedIngredientIds.has(ingredient.id))
      .sort((left, right) => left.name.localeCompare(right.name, "fr"));
  }, [recipes, ingredients]);

  const hasActiveFilters = selectedIngredients.length > 0;

  const filteredRecipes = useMemo(() => {
    if (selectedIngredients.length === 0) {
      return recipes;
    }

    return recipes.filter((recipe) =>
      selectedIngredients.every((ingredient) =>
        recipe.ingredients.some((item) => item.ingredientId === ingredient.id),
      ),
    );
  }, [recipes, selectedIngredients]);

  const cardDataByRecipeId = useMemo(() => {
    const entries = new Map<
      string,
      { perPortion: number | null; isComplete: boolean; matchPercent: number | null }
    >();
    for (const recipe of filteredRecipes) {
      const price = computeRecipeListPrice({
        recipe,
        portions: portionCount,
        ingredients,
        globalRatios,
        units,
        stockByIngredientId,
        cartItems,
        isInCart: isInCart(recipe.id),
        recipes: allRecipes,
        priceMode,
      });
      const match = isInCart(recipe.id)
        ? { percent: null }
        : computeRecipeListMatch({
            recipe,
            portions: portionCount,
            ingredients,
            globalRatios,
            units,
            stockByIngredientId,
            cartItems,
            isInCart: false,
            recipes: allRecipes,
          });
      entries.set(recipe.id, {
        perPortion: price.perPortion,
        isComplete: price.isComplete,
        matchPercent: match.percent,
      });
    }
    return entries;
  }, [
    filteredRecipes,
    portionCount,
    ingredients,
    globalRatios,
    units,
    stockByIngredientId,
    cartItems,
    isInCart,
    allRecipes,
    priceMode,
  ]);

  const sortedRecipes = useMemo(() => {
    const list = [...filteredRecipes];

    list.sort((left, right) => {
      const leftData = cardDataByRecipeId.get(left.id);
      const rightData = cardDataByRecipeId.get(right.id);

      if (sortMode === "alphabetical") {
        return left.name.localeCompare(right.name, "fr");
      }

      if (sortMode === "match") {
        const leftMatch = leftData?.matchPercent ?? -1;
        const rightMatch = rightData?.matchPercent ?? -1;
        return rightMatch - leftMatch;
      }

      const leftPrice = leftData?.perPortion;
      const rightPrice = rightData?.perPortion;
      if (leftPrice == null && rightPrice == null) {
        return 0;
      }
      if (leftPrice == null) {
        return 1;
      }
      if (rightPrice == null) {
        return -1;
      }
      return leftPrice - rightPrice;
    });

    return list;
  }, [filteredRecipes, cardDataByRecipeId, sortMode]);

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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <Combobox
            multiple
            items={recipeIngredientOptions}
            value={selectedIngredients}
            itemToStringLabel={(item) => item.name}
            itemToStringValue={(item) => item.name}
            isItemEqualToValue={(left, right) => left.id === right.id}
            onValueChange={(value) => setSelectedIngredients(value)}
          >
            <div
              ref={comboboxAnchorRef}
              className="flex min-h-9 w-full items-center gap-2 rounded-full border border-input bg-background px-3 py-1.5 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
            >
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <ComboboxChips className="min-h-0 flex-1 gap-1 border-0 bg-transparent p-0 shadow-none focus-within:border-0 focus-within:ring-0 dark:bg-transparent">
                <ComboboxValue>
                  {(value: IngredientRecord[]) => (
                    <>
                      {value.map((ingredient) => (
                        <ComboboxChip key={ingredient.id} aria-label={ingredient.name}>
                          {ingredient.name}
                        </ComboboxChip>
                      ))}
                      <ComboboxChipsInput
                        placeholder={
                          value.length === 0
                            ? "Rechercher par ingrédient…"
                            : "Ajouter un ingrédient…"
                        }
                        className="min-w-24 flex-1 bg-transparent"
                      />
                    </>
                  )}
                </ComboboxValue>
              </ComboboxChips>
            </div>
            <ComboboxContent anchor={comboboxAnchorRef}>
              <ComboboxEmpty>Aucun ingrédient trouvé.</ComboboxEmpty>
              <ComboboxList>
                {(option) => (
                  <ComboboxItem key={option.id} value={option}>
                    <div className="flex min-w-0 items-center gap-3">
                      <EntityImage src={ingredientImageUrl(option)} label={option.name} size="sm" />
                      <span className="truncate font-medium">{option.name}</span>
                    </div>
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>

        <Field label="Portions" className="w-auto shrink-0">
          <Input
            type="number"
            min={1}
            value={listPortions}
            onChange={(event) => setListPortions(Number(event.target.value) || 1)}
            className="w-20 rounded-full bg-background"
          />
        </Field>

        <Field label="Tri" className="w-full shrink-0 sm:w-52">
          <NativeSelect
            value={sortMode}
            onChange={(event) => {
              const value = event.target.value;
              if (isRecipeListSortMode(value)) {
                setSortMode(value);
              }
            }}
            aria-label="Trier les recettes"
            className="w-full"
          >
            <NativeSelectOption value="match">Plus haut match</NativeSelectOption>
            <NativeSelectOption value="alphabetical">Alphabétique</NativeSelectOption>
            <NativeSelectOption value="price">Portion la moins chère</NativeSelectOption>
          </NativeSelect>
        </Field>

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
            {hasActiveFilters
              ? "Aucune recette ne contient tous ces ingrédients."
              : "Aucune recette pour le moment."}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedRecipes.map((recipe) => {
            const cardData = cardDataByRecipeId.get(recipe.id);
            return (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                priceMode={priceMode}
                pricePerPortion={cardData?.perPortion ?? null}
                priceComplete={cardData?.isComplete ?? false}
                matchPercent={cardData?.matchPercent ?? null}
                isInCart={isInCart(recipe.id)}
                onAddToCart={() => onAddToCart(recipe.id, portionCount)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
