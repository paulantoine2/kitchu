"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Plus, TriangleAlert } from "lucide-react";
import { useKitchuSearch } from "@/components/kitchu/kitchu-search";
import { ingredientImageUrl } from "@/components/kitchu/images";
import {
  formatMacroPer100gCell,
  formatMacroProfilePer100gSummary,
} from "@/components/kitchu/recipe-macros";
import type { IngredientRecord } from "@/components/kitchu/types";
import { EntityImage } from "@/components/kitchu/ui/shared";
import { compareProductStoragePriority, productStorageBadgeClass, productStorageLabels } from "@/lib/product-storage";
import { measurementKindLabel } from "@/components/kitchu/unit-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";

const INGREDIENT_MACRO_COLUMNS = [
  { key: "caloriesPer100g", label: "kcal", kind: "calories" },
  { key: "proteinPer100g", label: "Prot.", kind: "grams" },
  { key: "carbsPer100g", label: "Gluc.", kind: "grams" },
  { key: "fatPer100g", label: "Lip.", kind: "grams" },
] as const;

function ingredientMacroProfile(ingredient: IngredientRecord) {
  return {
    caloriesPer100g: ingredient.caloriesPer100g,
    proteinPer100g: ingredient.proteinPer100g,
    carbsPer100g: ingredient.carbsPer100g,
    fatPer100g: ingredient.fatPer100g,
  };
}

function IngredientMobileItem({ ingredient }: { ingredient: IngredientRecord }) {
  const imageUrl = ingredientImageUrl(ingredient);
  const hasProducts = ingredient.products.length > 0;
  const stockedProducts = ingredient.products
    .filter((product) => product.stockQuantity && product.stockQuantity > 0)
    .sort((left, right) => compareProductStoragePriority(left.storageType, right.storageType));
  const macroSummary = formatMacroProfilePer100gSummary(ingredientMacroProfile(ingredient));

  return (
    <Item variant="outline" size="sm" render={<Link href={`/ingredients/${ingredient.id}`} />}>
      <ItemMedia variant="image">
        <EntityImage src={imageUrl} label={ingredient.name} size="xs" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="truncate">{ingredient.name}</ItemTitle>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge variant="secondary">{measurementKindLabel(ingredient.baseUnit.kind)}</Badge>
          {hasProducts ? (
            <Badge variant="secondary">
              {ingredient.products.length} produit{ingredient.products.length !== 1 ? "s" : ""}
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            >
              <TriangleAlert />
              Sans produit
            </Badge>
          )}
          {stockedProducts.map((product) => (
            <Badge
              key={product.id}
              variant="secondary"
              className={productStorageBadgeClass[product.storageType]}
            >
              {productStorageLabels[product.storageType]} · {formatNumber(product.stockQuantity!)}{" "}
              {ingredient.baseUnit.symbol}
            </Badge>
          ))}
        </div>
        {macroSummary ? (
          <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">/100 {ingredient.baseUnit.symbol} · {macroSummary}</p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">Macros non renseignées</p>
        )}
      </ItemContent>
    </Item>
  );
}

function IngredientTableRow({ ingredient }: { ingredient: IngredientRecord }) {
  const imageUrl = ingredientImageUrl(ingredient);
  const hasProducts = ingredient.products.length > 0;
  const stockedProducts = ingredient.products
    .filter((product) => product.stockQuantity && product.stockQuantity > 0)
    .sort((left, right) => compareProductStoragePriority(left.storageType, right.storageType));
  const macroProfile = ingredientMacroProfile(ingredient);

  return (
    <TableRow>
      <TableCell className="w-12">
        <EntityImage src={imageUrl} label={ingredient.name} size="xs" />
      </TableCell>
      <TableCell className="max-w-[280px] whitespace-normal">
        <Link
          href={`/ingredients/${ingredient.id}`}
          className="font-medium underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          {ingredient.name}
        </Link>
      </TableCell>
      <TableCell>{measurementKindLabel(ingredient.baseUnit.kind)}</TableCell>
      {INGREDIENT_MACRO_COLUMNS.map((column) => (
        <TableCell key={column.key} className="text-right tabular-nums">
          {formatMacroPer100gCell(macroProfile[column.key], column.kind)}
        </TableCell>
      ))}
      <TableCell>
        {hasProducts ? (
          <Badge variant="secondary">
            {ingredient.products.length} produit{ingredient.products.length !== 1 ? "s" : ""}
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          >
            <TriangleAlert />
            Sans produit
          </Badge>
        )}
      </TableCell>
      <TableCell className="whitespace-normal">
        {stockedProducts.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {stockedProducts.map((product) => (
              <Badge
                key={product.id}
                variant="secondary"
                className={productStorageBadgeClass[product.storageType]}
              >
                {productStorageLabels[product.storageType]} · {formatNumber(product.stockQuantity!)}{" "}
                {ingredient.baseUnit.symbol}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export function IngredientList({
  ingredients,
  onNewIngredient,
}: {
  ingredients: IngredientRecord[];
  onNewIngredient: () => void;
}) {
  const { query } = useKitchuSearch();

  const filteredIngredients = useMemo(
    () =>
      ingredients.filter((ingredient) =>
        ingredient.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [ingredients, query],
  );

  return (
    <div className="mx-auto max-w-[1120px] animate-fade-in px-4 py-8 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Ingrédients</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredIngredients.length} ingrédient{filteredIngredients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={onNewIngredient} className="shrink-0 self-start sm:self-auto">
          <Plus data-icon="inline-start" />
          Nouvel ingrédient
        </Button>
      </div>

      {filteredIngredients.length === 0 ? (
        <Empty className="border border-dashed border-border/80 bg-card/50 py-16">
          <EmptyDescription>
            {query ? "Aucun ingrédient ne correspond à votre recherche." : "Aucun ingrédient pour le moment."}
          </EmptyDescription>
        </Empty>
      ) : (
        <>
          <ItemGroup className="stagger-children gap-2 md:hidden">
            {filteredIngredients.map((ingredient) => (
              <IngredientMobileItem key={ingredient.id} ingredient={ingredient} />
            ))}
          </ItemGroup>
          <div className="hidden animate-fade-up overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-foreground/[0.05] md:block dark:ring-foreground/[0.08]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>Nom</TableHead>
                  <TableHead>Unité de base</TableHead>
                  <TableHead className="text-right">kcal/100</TableHead>
                  <TableHead className="text-right">Prot.</TableHead>
                  <TableHead className="text-right">Gluc.</TableHead>
                  <TableHead className="text-right">Lip.</TableHead>
                  <TableHead>Produits</TableHead>
                  <TableHead>Stock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIngredients.map((ingredient) => (
                  <IngredientTableRow key={ingredient.id} ingredient={ingredient} />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
