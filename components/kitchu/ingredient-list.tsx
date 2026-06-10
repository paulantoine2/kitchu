"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search, TriangleAlert, Utensils } from "lucide-react";
import { ingredientImageUrl } from "@/components/kitchu/images";
import type { IngredientRecord } from "@/components/kitchu/types";
import { EntityImage } from "@/components/kitchu/ui/shared";
import { compareProductStoragePriority, productStorageBadgeClass, productStorageLabels } from "@/lib/product-storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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

import { motion } from "framer-motion";

function IngredientMobileItem({ ingredient }: { ingredient: IngredientRecord }) {
  const imageUrl = ingredientImageUrl(ingredient);
  const hasProducts = ingredient.products.length > 0;
  const stockedProducts = ingredient.products
    .filter((product) => product.stockQuantity && product.stockQuantity > 0)
    .sort((left, right) => compareProductStoragePriority(left.storageType, right.storageType));

  return (
    <Item variant="outline" size="sm" render={<Link href={`/ingredients/${ingredient.id}`} />}>
      <ItemMedia variant="image">
        <EntityImage src={imageUrl} label={ingredient.name} size="xs" />
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="truncate">{ingredient.name}</ItemTitle>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <Badge variant="secondary">{ingredient.baseUnit.symbol}</Badge>
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="mx-auto max-w-[1480px] px-4 py-6 lg:px-8"
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Ingrédients</h1>
          <p className="text-sm text-muted-foreground">
            {filteredIngredients.length} ingrédient{filteredIngredients.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={onNewIngredient} className="shrink-0 self-start sm:self-auto" render={<motion.button whileTap={{ scale: 0.96 }} />}>
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Empty className="border-transparent bg-muted/20">
            <EmptyMedia variant="icon"><Utensils /></EmptyMedia>
            <EmptyTitle>Aucun ingrédient trouvé</EmptyTitle>
            <EmptyDescription>
              {search ? "Aucun ingrédient ne correspond à votre recherche." : "Commencez par ajouter votre premier ingrédient."}
            </EmptyDescription>
            <Button className="mt-4" onClick={onNewIngredient} render={<motion.button whileTap={{ scale: 0.96 }} />}>
              Ajouter un ingrédient
            </Button>
          </Empty>
        </motion.div>
      ) : (
        <>
          <ItemGroup className="gap-2 md:hidden">
            {filteredIngredients.map((ingredient) => (
              <IngredientMobileItem key={ingredient.id} ingredient={ingredient} />
            ))}
          </ItemGroup>
          <div className="hidden overflow-hidden rounded-2xl border-transparent bg-card shadow-[0_2px_8px_rgba(0,0,0,0.04),0_12px_24px_rgba(0,0,0,0.04)] md:block">
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
        </>
      )}
    </motion.div>
  );
}
