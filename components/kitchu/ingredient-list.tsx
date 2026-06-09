"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search, TriangleAlert } from "lucide-react";
import { ingredientImageUrl } from "@/components/kitchu/images";
import type { IngredientRecord } from "@/components/kitchu/types";
import { compareProductStoragePriority, productStorageBadgeClass, productStorageLabels } from "@/lib/product-storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { formatNumber } from "@/lib/utils";

function IngredientCard({ ingredient }: { ingredient: IngredientRecord }) {
  const imageUrl = ingredientImageUrl(ingredient);
  const hasProducts = ingredient.products.length > 0;
  const stockedProducts = ingredient.products
    .filter((product) => product.stockQuantity && product.stockQuantity > 0)
    .sort((left, right) => compareProductStoragePriority(left.storageType, right.storageType));

  return (
    <Link href={`/ingredients/${ingredient.id}`}>
      <Card className="overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-[4/3] overflow-hidden bg-primary/10">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={ingredient.name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-4xl font-semibold text-primary">
              {ingredient.name.trim().charAt(0).toUpperCase() || "?"}
            </div>
          )}
          {!hasProducts && (
            <Badge
              variant="secondary"
              className="absolute top-2 right-2 gap-1 border-amber-500/30 bg-amber-500/10 text-amber-700 shadow-sm dark:text-amber-400"
            >
              <TriangleAlert className="size-3" />
              Sans produit
            </Badge>
          )}
        </div>
        <CardContent className="pt-3">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug">{ingredient.name}</h3>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="secondary">
              {ingredient.products.length} produit{ingredient.products.length !== 1 ? "s" : ""}
            </Badge>
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
        </CardContent>
      </Card>
    </Link>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredIngredients.map((ingredient) => (
            <IngredientCard key={ingredient.id} ingredient={ingredient} />
          ))}
        </div>
      )}
    </div>
  );
}
