"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { Plus, Search, ShoppingCart } from "lucide-react";
import { ingredientImageUrl, recipeImageUrl } from "@/components/kitchu/images";
import {
  computeRecipeListMatch,
  computeRecipeListPrice,
  type RecipeListPriceMode,
} from "@/components/kitchu/recipe-cost";
import { RecipeMatchGauge } from "@/components/kitchu/recipe-match-gauge";
import type { CartRecipeEntry, IngredientRecord, RecipeRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";
import { EntityImage, Field, PartialEstimateIndicator, type PartialEstimateSeverity } from "@/components/kitchu/ui/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

function subscribeToClientMount() {
  return () => {};
}

function getClientMountedSnapshot() {
  return true;
}

function getServerMountedSnapshot() {
  return false;
}

type RecipeListSortMode = "match" | "alphabetical" | "price";

function isRecipeListSortMode(value: string): value is RecipeListSortMode {
  return value === "match" || value === "alphabetical" || value === "price";
}

function PriceModeToggle({
  priceMode,
  onPriceModeChange,
  className,
}: {
  priceMode: RecipeListPriceMode;
  onPriceModeChange: (mode: RecipeListPriceMode) => void;
  className?: string;
}) {
  const mounted = useSyncExternalStore(
    subscribeToClientMount,
    getClientMountedSnapshot,
    getServerMountedSnapshot,
  );

  return (
    <div
      role="group"
      aria-label="Basculer entre prix théorique et prix d'achat"
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5",
        className,
      )}
    >
      <Label
        className={cn(
          "text-sm font-medium",
          priceMode === "theoretical" ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Théorique
      </Label>
      {mounted ? (
        <Switch
          id="price-mode-toggle"
          checked={priceMode === "purchase"}
          onCheckedChange={(checked) => onPriceModeChange(checked ? "purchase" : "theoretical")}
          aria-label="Basculer entre prix théorique et prix d'achat"
        />
      ) : (
        <div
          aria-hidden
          className={cn(
            "h-[18.4px] w-[32px] shrink-0 rounded-full bg-input",
            priceMode === "purchase" && "bg-primary",
          )}
        />
      )}
      <Label
        className={cn(
          "text-sm font-medium",
          priceMode === "purchase" ? "text-foreground" : "text-muted-foreground",
        )}
      >
        Achat
      </Label>
    </div>
  );
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
  const estimateSeverity: PartialEstimateSeverity | null =
    pricePerPortion === null ? "critical" : !priceComplete ? "minor" : null;

  const cartButtonLabel = isInCart ? "Ajuster le panier" : "Ajouter au panier";

  return (
    <Card className="group/recipe-card gap-3 overflow-hidden py-0 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-lifted has-data-[slot=card-footer]:pb-0">
      <Link
        href={`/recipes/${recipe.id}`}
        aria-label={`Voir la recette ${recipe.name}`}
        className="block rounded-t-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-accent">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              className="size-full object-cover transition-transform duration-500 ease-out group-hover/recipe-card:scale-[1.04]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-4xl font-semibold text-primary/70">
              {recipe.name.trim().charAt(0).toUpperCase() || "K"}
            </div>
          )}
          {isInCart ? (
            <Badge className="absolute top-3 left-3 shadow-soft">Dans le panier</Badge>
          ) : (
            matchPercent !== null && (
              <div className="absolute top-3 left-3">
                <RecipeMatchGauge percent={matchPercent} size={44} framed />
              </div>
            )
          )}
        </div>
        <CardHeader className="pt-4">
          <CardTitle className="line-clamp-2 text-lg leading-snug">{recipe.name}</CardTitle>
          {totalMinutes > 0 && <CardDescription>{totalMinutes} min</CardDescription>}
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {priceMode === "theoretical" ? "Prix théorique" : "Prix d'achat"}
          </p>
          <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">
            {pricePerPortion !== null ? (
              <>
                {formatCurrency(pricePerPortion)}
                <span className="text-sm font-medium text-muted-foreground">/portion</span>
              </>
            ) : (
              "—"
            )}
          </p>
          <PartialEstimateIndicator severity={estimateSeverity} className="mt-2" />
        </CardContent>
      </Link>
      <CardFooter className="border-t-0 bg-transparent pt-0">
        <Button
          size="sm"
          variant={isInCart ? "secondary" : "default"}
          className="w-full"
          aria-label={`${cartButtonLabel} : ${recipe.name}`}
          onClick={onAddToCart}
        >
          <ShoppingCart data-icon="inline-start" />
          {cartButtonLabel}
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
    <div className="mx-auto max-w-[1480px] animate-fade-in px-4 py-8 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Recettes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredRecipes.length} recette{filteredRecipes.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={onNewRecipe} className="shrink-0 self-start sm:self-auto">
          <Plus data-icon="inline-start" />
          Nouvelle recette
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <div className="min-w-0 w-full">
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

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Portions">
            <Input
              type="number"
              min={1}
              value={listPortions}
              onChange={(event) => setListPortions(Number(event.target.value) || 1)}
              className="w-full rounded-full bg-background"
            />
          </Field>

          <Field label="Tri" className="col-span-1 sm:col-span-2">
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

          <div className="col-span-2 flex w-full items-end sm:col-span-1">
            <PriceModeToggle
              priceMode={priceMode}
              onPriceModeChange={setPriceMode}
              className="w-full justify-center sm:w-auto sm:justify-start"
            />
          </div>
        </div>
      </div>

      {filteredRecipes.length === 0 ? (
        <Empty className="border border-dashed border-border/80 bg-card/50 py-16">
          <EmptyDescription>
            {hasActiveFilters
              ? "Aucune recette ne contient tous ces ingrédients."
              : "Aucune recette pour le moment. Créez votre première recette pour commencer."}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="stagger-children grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
