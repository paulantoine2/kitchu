"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search, TriangleAlert } from "lucide-react";
import { ingredientImageUrl } from "@/components/kitchu/images";
import type { IngredientRecord } from "@/components/kitchu/types";
import { EntityImage } from "@/components/kitchu/ui/shared";
import { compareProductStoragePriority, productStorageBadgeClass, productStorageLabels } from "@/lib/product-storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";

function IngredientTableRow({ ingredient }: { ingredient: IngredientRecord }) {
  const imageUrl = ingredientImageUrl(ingredient);
  const hasProducts = ingredient.products.length > 0;
  const stockedProducts = ingredient.products
    .filter((product) => product.stockQuantity && product.stockQuantity > 0)
    .sort((left, right) => compareProductStoragePriority(left.storageType, right.storageType));

  return (
    <TableRow>
      <TableCell className="w-12">
        <EntityImage src={imageUrl} label={ingredient.name} size="xs" />
      </TableCell>
      <TableCell className="max-w-[280px] whitespace-normal">
        <Link href={`/ingredients/${ingredient.id}`} className="font-medium hover:underline">
          {ingredient.name}
        </Link>
      </TableCell>
      <TableCell>{ingredient.baseUnit.symbol}</TableCell>
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
  const [search, setSearch] = useState("");

  const filteredIngredients = useMemo(
    () =>
      ingredients.filter((ingredient) =>
        ingredient.name.toLowerCase().includes(search.toLowerCase()),
      ),
    [ingredients, search],
  );

  return (
    <div className="mx-auto max-w-[1480px] px-4 py-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Ingrédients</h2>
          <p className="text-sm text-muted-foreground">
            {filteredIngredients.length} ingrédient{filteredIngredients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onNewIngredient} className="shrink-0 self-start sm:self-auto">
          <Plus data-icon="inline-start" />
          Nouvel ingrédient
        </Button>
      </div>

      <InputGroup className="mb-6 rounded-full">
        <InputGroupAddon align="inline-start">
          <Search />
        </InputGroupAddon>
        <InputGroupInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un ingrédient"
        />
      </InputGroup>

      {filteredIngredients.length === 0 ? (
        <Empty className="border-border bg-card">
          <EmptyDescription>
            {search ? "Aucun ingrédient ne correspond à votre recherche." : "Aucun ingrédient pour le moment."}
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Nom</TableHead>
                <TableHead>Unité de base</TableHead>
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
      )}
    </div>
  );
}
