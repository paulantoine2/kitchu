"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Beef, ChevronDown, Clock, Droplet, Flame, Scale, ShoppingCart, Wheat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { convertToBase, scaleQuantity } from "@/lib/conversions";
import { recipeLineToBaseFactor } from "@/components/kitchu/unit-helpers";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import { ingredientImageUrl, recipeImageUrl } from "@/components/kitchu/images";
import { ProductStorageBadge } from "@/components/kitchu/product-storage-badge";
import type { CartRecipeEntry } from "@/components/kitchu/cart";
import {
  compareProductStoragePriority,
} from "@/lib/product-storage";
import {
  estimatePurchaseTotal,
  estimateRecipeViewCosts,
  computeRecipeInventoryMatch,
  sumPartial,
  type RecipeCostEstimate,
} from "@/components/kitchu/recipe-cost";
import { RecipeMatchGauge } from "@/components/kitchu/recipe-match-gauge";
import type { IngredientRecord, RecipeRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";
import {
  EntityImage,
  Field,
} from "@/components/kitchu/ui/shared";
import { uniqueUnits } from "@/components/kitchu/utils";
import {
  estimateRecipeWeightPerServing,
  formatRecipeWeight,
} from "@/components/kitchu/recipe-weight";
import {
  estimateRecipeMacrosPerServing,
  formatMacroCalories,
} from "@/components/kitchu/recipe-macros";
import { RecipeMacrosPanel } from "@/components/kitchu/recipe-macros-panel";

type RecipeIngredientRow = RecipeRecord["ingredients"][number];

function ingredientHref(ingredientId: string) {
  return `/ingredients/${ingredientId}`;
}

function productHref(ingredientId: string, productId: string) {
  return `/ingredients/${ingredientId}#product-${productId}`;
}

const entityLinkClassName =
  "transition-colors hover:text-primary hover:underline underline-offset-2";

function formatIngredientQuantity(item: RecipeIngredientRow, portions: number, globalRatios: UnitRatioRecord[], units: UnitRecord[]) {
  const scaledRecipeQuantity = scaleQuantity(item.quantityPerServing, portions);
  const primary = `${formatNumber(scaledRecipeQuantity)} ${item.unit.symbol}`;
  const usesBaseUnit = item.unitId === item.ingredient.baseUnitId;

  if (usesBaseUnit) {
    return { primary, secondary: null };
  }

  const baseFactor = recipeLineToBaseFactor(
    item.ingredient,
    item.unit,
    item.unitId,
    item.unitToBaseFactor,
    globalRatios,
    units,
  );
  const baseQuantity = convertToBase(item.quantityPerServing, baseFactor);

  if (baseQuantity === null) {
    return { primary, secondary: null };
  }

  const scaledBaseQuantity = scaleQuantity(baseQuantity, portions);
  return {
    primary,
    secondary: `≈ ${formatNumber(scaledBaseQuantity)} ${item.ingredient.baseUnit.symbol}`,
  };
}

function needsPurchase(estimate: RecipeCostEstimate) {
  if (estimate.toPurchasePieceCount !== null) {
    return estimate.toPurchasePieceCount > 0;
  }
  return estimate.toPurchaseBaseQuantity > 0;
}

function formatPurchaseQuantity(estimate: RecipeCostEstimate) {
  if (estimate.toPurchasePieceCount !== null && estimate.toPurchasePieceCount > 0) {
    const pieces = estimate.toPurchasePieceCount;
    return `À acheter ${formatNumber(pieces)} pièce${pieces > 1 ? "s" : ""}`;
  }
  return `À acheter ${formatNumber(estimate.toPurchaseBaseQuantity)} ${estimate.baseUnit.symbol}`;
}

function isCoveredByInventory(estimate: RecipeCostEstimate, applyStock: boolean) {
  return (
    applyStock &&
    !needsPurchase(estimate) &&
    (estimate.stockUsed > 0 || estimate.cartLeftoverUsed > 0)
  );
}

function compactPurchaseSummary(
  estimate: RecipeCostEstimate,
  applyStock: boolean,
): { label: string; price: string | null } {
  if (isCoveredByInventory(estimate, applyStock)) {
    return { label: "Couvert par le stock", price: formatCurrency(0) };
  }

  if (applyStock && needsPurchase(estimate)) {
    return {
      label: formatPurchaseQuantity(estimate),
      price: estimate.purchasePlan ? formatCurrency(estimate.purchasePlan.totalPrice) : null,
    };
  }

  if (estimate.purchasePlan && estimate.purchasePlan.items.length > 0) {
    return {
      label: "À acheter",
      price: formatCurrency(estimate.purchasePlan.totalPrice),
    };
  }

  return {
    label: estimate.missingReason ?? "Indisponible",
    price: null,
  };
}

function RecipeIngredientItem({
  item,
  quantity,
  estimate,
  applyStock,
}: {
  item: RecipeIngredientRow;
  quantity: ReturnType<typeof formatIngredientQuantity>;
  estimate: RecipeCostEstimate | undefined;
  applyStock: boolean;
}) {
  const purchaseSummary = estimate ? compactPurchaseSummary(estimate, applyStock) : null;

  const rowBody = (
    <>
      <ItemMedia variant="image">
        <EntityImage src={ingredientImageUrl(item.ingredient)} label={item.ingredient.name} size="xs" />
      </ItemMedia>
      <ItemContent className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0 flex-1">
            <ItemTitle className="w-full min-w-0 text-base font-semibold">
              <span>{item.ingredient.name}</span>
            </ItemTitle>
            <p className="mt-0.5 min-h-5 text-sm leading-5 text-muted-foreground">
              {purchaseSummary?.label ?? "\u00A0"}
            </p>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <div className="flex min-h-[3.75rem] flex-col items-end justify-start gap-0.5 text-right">
              <span className="text-sm font-semibold leading-5 text-primary">{quantity.primary}</span>
              <span className="min-h-4 text-xs leading-4 text-muted-foreground">
                {quantity.secondary ?? "\u00A0"}
              </span>
              <span className="min-h-5 text-sm font-semibold leading-5 tabular-nums">
                {purchaseSummary?.price ?? "\u00A0"}
              </span>
            </div>
            <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-data-[panel-open]/trigger:rotate-180" />
          </div>
        </div>
        {item.note && <ItemDescription className="mt-1">{item.note}</ItemDescription>}
      </ItemContent>
    </>
  );

  const itemClassName =
    "w-full flex-col items-stretch gap-0 rounded-none border-0 p-0";

  return (
    <Collapsible className="w-full">
      <Item size="sm" className={itemClassName}>
        <CollapsibleTrigger
          className="group/trigger flex w-full cursor-pointer items-start gap-3 px-5 py-2 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/50 data-[panel-open]:bg-muted/30"
          aria-label={`Détail d'achat pour ${item.ingredient.name}`}
        >
          {rowBody}
        </CollapsibleTrigger>
        <CollapsibleContent className="flex min-w-0 flex-col overflow-hidden">
          <Separator className="opacity-60" />
          <ItemFooter className="w-full min-w-0 flex-col items-stretch px-5 py-2.5">
            {estimate ? (
              <IngredientPurchaseDetails estimate={estimate} ingredient={item.ingredient} applyStock={applyStock} />
            ) : (
              <p className="text-sm text-muted-foreground">Aucun détail d&apos;achat disponible.</p>
            )}
          </ItemFooter>
        </CollapsibleContent>
      </Item>
    </Collapsible>
  );
}

function formatMacroGrams(value: number) {
  return `${formatNumber(value)} g`;
}

function RecipeStatItem({
  value,
  label,
  detail,
  icon,
  compact = false,
}: {
  value: ReactNode;
  label: string;
  detail?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-2xl bg-card shadow-soft ring-1 ring-foreground/[0.05] dark:ring-foreground/[0.08]",
        compact ? "min-h-0 gap-2 p-3" : "min-h-28 gap-4 p-4",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[11px] font-medium text-muted-foreground">{label}</p>
        {icon && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground",
              compact ? "size-7 [&_svg]:size-3.5" : "size-9",
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <div>
        <p
          className={cn(
            "font-semibold tabular-nums tracking-tight",
            compact ? "text-base" : "text-xl sm:text-2xl",
          )}
        >
          {value}
        </p>
        {detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}
      </div>
    </div>
  );
}

function RecipeSidebarPanel({
  title,
  description,
  children,
  className,
  unified,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  unified?: boolean;
}) {
  if (unified) {
    return (
      <div className={cn("border-b border-border/60 last:border-b-0", className)}>
        <div className="px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <div className="px-5 pb-5">{children}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-card shadow-soft ring-1 ring-foreground/[0.05] dark:ring-foreground/[0.08]",
        className,
      )}
    >
      <div className="border-b border-border/60 px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function RecipeSidebarActions({
  portions,
  setPortions,
  isInCart,
  onCartAction,
  applyStock,
  setApplyStock,
  hasEstimates,
  unified,
}: {
  portions: number;
  setPortions: (value: number) => void;
  isInCart: boolean;
  onCartAction: () => void;
  applyStock: boolean;
  setApplyStock: (value: boolean) => void;
  hasEstimates: boolean;
  unified?: boolean;
}) {
  const content = (
    <div className="flex flex-col gap-4">
      <Field label="Portions">
        <Input
          type="number"
          min={1}
          value={portions}
          onChange={(event) => setPortions(Number(event.target.value) || 1)}
          className="rounded-full bg-background"
        />
      </Field>
      <Button variant={isInCart ? "secondary" : "default"} className="w-full" onClick={onCartAction}>
        <ShoppingCart data-icon="inline-start" />
        {isInCart ? "Ajuster le panier" : "Ajouter au panier"}
      </Button>
      {hasEstimates && (
        <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal text-muted-foreground">
          <Checkbox checked={applyStock} onCheckedChange={(checked) => setApplyStock(checked === true)} />
          Prendre en compte le stock et le panier
        </Label>
      )}
    </div>
  );

  return (
    <RecipeSidebarPanel title="Préparer cette recette" unified={unified}>
      {content}
    </RecipeSidebarPanel>
  );
}

function RecipeSidebarCosts({
  theoreticalTotal,
  purchaseTotal,
  portionCount,
  unified,
}: {
  theoreticalTotal: number | null;
  purchaseTotal: number | null;
  portionCount: number;
  unified?: boolean;
}) {
  const theoreticalPerPortion =
    theoreticalTotal !== null ? theoreticalTotal / portionCount : null;
  const purchasePerPortion = purchaseTotal !== null ? purchaseTotal / portionCount : null;

  return (
    <RecipeSidebarPanel title="Coûts estimés" unified={unified}>
      <div className="grid grid-cols-2 gap-3">
        <div className="min-w-0 rounded-xl bg-muted/40 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Coût théorique</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
            {theoreticalPerPortion !== null ? (
              <>
                {formatCurrency(theoreticalPerPortion)}
                <span className="text-sm font-medium text-muted-foreground">/portion</span>
              </>
            ) : (
              "—"
            )}
          </p>
          {theoreticalTotal !== null && (
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              Total {formatCurrency(theoreticalTotal)}
            </p>
          )}
        </div>
        <div className="min-w-0 rounded-xl bg-accent px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Achat estimé</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight text-accent-foreground">
            {purchasePerPortion !== null ? (
              <>
                {formatCurrency(purchasePerPortion)}
                <span className="text-sm font-medium text-muted-foreground">/portion</span>
              </>
            ) : (
              "—"
            )}
          </p>
          {purchaseTotal !== null && (
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              Total {formatCurrency(purchaseTotal)}
            </p>
          )}
        </div>
      </div>
    </RecipeSidebarPanel>
  );
}

function RecipeStepsSection({
  sortedSteps,
  totalMinutes,
  prepMinutes,
  cookMinutes,
}: {
  sortedSteps: RecipeRecord["steps"];
  totalMinutes: number;
  prepMinutes: number | null;
  cookMinutes: number | null;
}) {
  const durationDetail =
    prepMinutes !== null && cookMinutes !== null
      ? `${prepMinutes} prépa · ${cookMinutes} cuisson`
      : null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Étapes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {sortedSteps.length} étape{sortedSteps.length > 1 ? "s" : ""} de préparation
          </p>
        </div>
        {totalMinutes > 0 && (
          <div className="flex items-center gap-2.5 rounded-xl bg-muted/40 px-3 py-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold tabular-nums">{totalMinutes} min</p>
              {durationDetail && <p className="text-xs text-muted-foreground">{durationDetail}</p>}
            </div>
          </div>
        )}
      </div>
      <div className="flex flex-col divide-y divide-border/50 rounded-2xl bg-card shadow-soft ring-1 ring-foreground/[0.05] dark:ring-foreground/[0.08]">
        {sortedSteps.map((step, index) => (
          <div key={step.id} className="group/step flex gap-4 px-5 py-4">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground transition-colors duration-200 group-hover/step:bg-primary group-hover/step:text-primary-foreground">
              {index + 1}
            </div>
            <p className="min-w-0 flex-1 pt-1 text-[15px] leading-7 text-foreground">{step.instruction}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function IngredientPurchaseDetails({
  estimate,
  ingredient,
  applyStock,
}: {
  estimate: RecipeCostEstimate;
  ingredient: IngredientRecord;
  applyStock: boolean;
}) {
  const purchasePlan = estimate.purchasePlan;
  const coveredByInventory =
    applyStock &&
    !needsPurchase(estimate) &&
    (estimate.stockUsed > 0 || estimate.cartLeftoverUsed > 0);
  const partiallyCovered =
    applyStock &&
    (estimate.stockUsed > 0 || estimate.cartLeftoverUsed > 0) &&
    needsPurchase(estimate);
  const hasInventoryContext =
    applyStock &&
    (estimate.stockAvailable > 0 ||
      estimate.stockUsed > 0 ||
      estimate.cartLeftoverAvailable > 0 ||
      estimate.cartLeftoverUsed > 0);
  const stockedProducts = ingredient.products
    .filter((product) => product.stockQuantity && product.stockQuantity > 0)
    .sort((left, right) => compareProductStoragePriority(left.storageType, right.storageType));

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      {hasInventoryContext && (
        <div className="flex flex-wrap gap-2">
          {estimate.stockAvailable > 0 && (
            <Badge variant="secondary" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              Stock {formatNumber(estimate.stockAvailable)} {estimate.baseUnit.symbol}
            </Badge>
          )}
          {stockedProducts.map((product) => (
            <Link
              key={product.id}
              href={productHref(ingredient.id, product.id)}
              className="inline-flex"
            >
              <Badge variant="outline" className="max-w-full gap-1.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <ProductStorageBadge storageType={product.storageType} className="shrink-0 text-[10px]" />
                <span className="truncate">
                  {formatNumber(product.stockQuantity!)} {estimate.baseUnit.symbol}
                  {product.name.trim() ? ` · ${product.name}` : ""}
                </span>
              </Badge>
            </Link>
          ))}
          {estimate.stockUsed > 0 && (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              Stock utilisé {formatNumber(estimate.stockUsed)} {estimate.baseUnit.symbol}
            </Badge>
          )}
          {estimate.cartLeftoverAvailable > 0 && (
            <Badge variant="secondary" className="border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-400">
              Restes panier {formatNumber(estimate.cartLeftoverAvailable)} {estimate.baseUnit.symbol}
            </Badge>
          )}
          {estimate.cartLeftoverUsed > 0 && (
            <Badge variant="outline" className="border-sky-500/30 text-sky-700 dark:text-sky-400">
              Panier utilisé {formatNumber(estimate.cartLeftoverUsed)} {estimate.baseUnit.symbol}
            </Badge>
          )}
          {coveredByInventory && (
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
              Couvert par le stock et le panier
            </Badge>
          )}
          {partiallyCovered && (
            <Badge variant="outline">
              {formatPurchaseQuantity(estimate)}
            </Badge>
          )}
        </div>
      )}
      <div className="grid min-w-0 grid-cols-2 gap-2">
        <div className="min-w-0 rounded-md bg-muted/40 px-2.5 py-2">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Théorique</p>
          <p className="mt-0.5 text-sm font-semibold">
            {estimate.theoreticalPrice === null ? "—" : formatCurrency(estimate.theoreticalPrice)}
          </p>
        </div>
        <div className="min-w-0 rounded-md bg-muted/40 px-2.5 py-2">
          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Restes</p>
          <p className="mt-0.5 text-sm font-semibold">
            {coveredByInventory
              ? "—"
              : purchasePlan
                ? `${formatNumber(purchasePlan.leftover)} ${estimate.baseUnit.symbol}`
                : "—"}
          </p>
        </div>
      </div>
      {estimate.pieceWarning && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400">
          {estimate.pieceWarning}
        </div>
      )}
      {coveredByInventory ? (
        <div className="rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
          Rien à acheter — couvert par le stock et les restes du panier
        </div>
      ) : purchasePlan && purchasePlan.items.length > 0 ? (
        <div className="flex flex-col gap-2">
          {purchasePlan.items.map((productItem) => {
            const productLabel = productItem.product.name.trim() || estimate.ingredientName;
            const productMeta = [productItem.product.store, productItem.product.brand]
              .filter(Boolean)
              .join(" · ");

            return (
              <Link
                key={productItem.product.id}
                href={productHref(ingredient.id, productItem.product.id)}
                className={cn(
                  "grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 overflow-hidden rounded-xl bg-muted/50 p-3 transition-colors duration-150 hover:bg-accent",
                  entityLinkClassName,
                )}
              >
                <EntityImage
                  src={productItem.product.imageUrl}
                  label={productLabel}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0 overflow-hidden">
                  <p className="truncate font-semibold leading-snug">{productLabel}</p>
                  <div className="mt-0.5 flex min-w-0 items-center gap-2">
                    <ProductStorageBadge
                      storageType={productItem.product.storageType}
                      className="shrink-0 text-[10px]"
                    />
                    {productMeta && (
                      <p className="min-w-0 truncate text-xs text-muted-foreground">{productMeta}</p>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">
                    {productItem.count}× {formatNumber(productItem.product.packageQuantity)}{" "}
                    {productItem.product.packageUnit.symbol}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-base font-semibold">{formatCurrency(productItem.price)}</p>
                  {productItem.count > 1 && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(productItem.product.price)}/colis
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
          {estimate.missingReason ?? "Indisponible"}
        </div>
      )}
    </div>
  );
}

function RecipeIngredientsPanel({
  sortedIngredients,
  estimates,
  portions,
  units,
  globalRatios,
  applyStock,
  unified,
}: {
  sortedIngredients: RecipeIngredientRow[];
  estimates: RecipeCostEstimate[];
  portions: number;
  units: UnitRecord[];
  globalRatios: UnitRatioRecord[];
  applyStock: boolean;
  unified?: boolean;
}) {
  const estimateByIngredientId = new Map(estimates.map((estimate) => [estimate.ingredientId, estimate]));

  return (
    <RecipeSidebarPanel title="Ingrédients" unified={unified}>
      {sortedIngredients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Aucun ingrédient dans cette recette.
        </div>
      ) : (
        <ItemGroup className="-mx-5 w-auto gap-0 divide-y divide-border/50">
          {sortedIngredients.map((item) => {
            const quantity = formatIngredientQuantity(item, portions, globalRatios, units);
            const estimate = estimateByIngredientId.get(item.ingredientId);

            return (
              <RecipeIngredientItem
                key={item.id}
                item={item}
                quantity={quantity}
                estimate={estimate}
                applyStock={applyStock}
              />
            );
          })}
        </ItemGroup>
      )}
    </RecipeSidebarPanel>
  );
}

function RecipeUnifiedSidebar({
  portions,
  setPortions,
  isInCart,
  onCartAction,
  applyStock,
  setApplyStock,
  hasEstimates,
  inventoryMatch,
  theoreticalTotal,
  purchaseTotal,
  portionCount,
  sortedIngredients,
  estimates,
  units,
  globalRatios,
}: {
  portions: number;
  setPortions: (value: number) => void;
  isInCart: boolean;
  onCartAction: () => void;
  applyStock: boolean;
  setApplyStock: (value: boolean) => void;
  hasEstimates: boolean;
  inventoryMatch: ReturnType<typeof computeRecipeInventoryMatch>;
  theoreticalTotal: number | null;
  purchaseTotal: number | null;
  portionCount: number;
  sortedIngredients: RecipeIngredientRow[];
  estimates: RecipeCostEstimate[];
  units: UnitRecord[];
  globalRatios: UnitRatioRecord[];
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] bg-card shadow-soft ring-1 ring-foreground/[0.05] dark:ring-foreground/[0.08]">
      {hasEstimates && inventoryMatch.percent !== null && (
        <div className="flex items-center gap-4 border-b border-border/60 px-5 py-4">
          <RecipeMatchGauge percent={inventoryMatch.percent} framed />
          <div className="min-w-0">
            <p className="font-semibold tracking-tight">Match stock</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Ce score estime ce que vous pouvez déjà cuisiner avec le stock et les restes du panier.
            </p>
          </div>
        </div>
      )}
      <RecipeSidebarActions
        portions={portions}
        setPortions={setPortions}
        isInCart={isInCart}
        onCartAction={onCartAction}
        applyStock={applyStock}
        setApplyStock={setApplyStock}
        hasEstimates={hasEstimates}
        unified
      />
      {hasEstimates && (
        <RecipeSidebarCosts
          theoreticalTotal={theoreticalTotal}
          purchaseTotal={purchaseTotal}
          portionCount={portionCount}
          unified
        />
      )}
      <RecipeIngredientsPanel
        sortedIngredients={sortedIngredients}
        estimates={estimates}
        portions={portions}
        units={units}
        globalRatios={globalRatios}
        applyStock={applyStock}
        unified
      />
    </div>
  );
}

export function RecipeView({
  recipe,
  recipes,
  units,
  ingredients,
  globalRatios,
  stockByIngredientId,
  cartItems,
  portions,
  setPortions,
  isInCart,
  onCartAction,
}: {
  recipe: RecipeRecord;
  recipes: RecipeRecord[];
  units: UnitRecord[];
  ingredients: IngredientRecord[];
  globalRatios: UnitRatioRecord[];
  stockByIngredientId: Map<string, number>;
  cartItems: CartRecipeEntry[];
  portions: number;
  setPortions: (value: number) => void;
  isInCart: boolean;
  onCartAction: () => void;
}) {
  const [applyStock, setApplyStock] = useState(true);
  const estimates = estimateRecipeViewCosts({
    recipe,
    portions,
    ingredients,
    globalRatios,
    units,
    stockByIngredientId,
    cartItems,
    isInCart,
    applyStock,
    recipes,
  });
  const matchEstimates = estimateRecipeViewCosts({
    recipe,
    portions,
    ingredients,
    globalRatios,
    units,
    stockByIngredientId,
    cartItems,
    isInCart,
    applyStock: true,
    recipes,
  });
  const sortedIngredients = recipe.ingredients.slice().sort((a, b) => a.position - b.position);
  const sortedSteps = recipe.steps.slice().sort((a, b) => a.position - b.position);
  const totalMinutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const heroImageUrl = recipeImageUrl(recipe);
  const portionCount = Math.max(1, portions);
  const hasEstimates = estimates.length > 0;
  const theoreticalSum = sumPartial(estimates.map((estimate) => estimate.theoreticalPrice));
  const purchaseSum = sumPartial(estimates.map(estimatePurchaseTotal));
  const inventoryMatch = computeRecipeInventoryMatch(matchEstimates);
  const weightEstimate = estimateRecipeWeightPerServing(recipe, globalRatios, units);
  const weightPerServingLabel = formatRecipeWeight(weightEstimate.gramsPerServing);
  const macroEstimate = estimateRecipeMacrosPerServing(recipe, globalRatios, units);
  const macroPerServing = macroEstimate.perServing;
  const recipeStats = [
    weightPerServingLabel
      ? {
          key: "weight",
          label: "Poids",
          value: weightPerServingLabel,
          icon: <Scale />,
        }
      : null,
    macroPerServing
      ? {
          key: "calories",
          label: "Calories",
          value: formatMacroCalories(macroPerServing.calories) ?? "—",
          icon: <Flame />,
        }
      : null,
    macroPerServing
      ? {
          key: "protein",
          label: "Protéines",
          value: formatMacroGrams(macroPerServing.protein),
          icon: <Beef />,
        }
      : null,
    macroPerServing
      ? {
          key: "carbs",
          label: "Glucides",
          value: formatMacroGrams(macroPerServing.carbs),
          icon: <Wheat />,
        }
      : null,
    macroPerServing
      ? {
          key: "fat",
          label: "Lipides",
          value: formatMacroGrams(macroPerServing.fat),
          icon: <Droplet />,
        }
      : null,
  ].filter((stat): stat is NonNullable<typeof stat> => stat !== null);

  return (
    <section className="flex min-w-0 animate-fade-in flex-col gap-8 lg:gap-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:gap-x-10 lg:gap-y-8 lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="min-w-0">
            <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
              {recipe.name}
            </h1>
            {recipe.description && (
              <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {recipe.description}
              </p>
            )}
          </div>

          {heroImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={heroImageUrl} alt={recipe.name} className="w-full rounded-[2rem] object-cover" />
          ) : (
            <div className="flex min-h-[300px] w-full items-center justify-center rounded-[2rem] bg-primary/10 text-6xl font-semibold text-primary sm:text-7xl">
              {recipe.name.trim().charAt(0).toUpperCase() || "K"}
            </div>
          )}
        </div>

        <aside className="lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <RecipeUnifiedSidebar
            portions={portions}
            setPortions={setPortions}
            isInCart={isInCart}
            onCartAction={onCartAction}
            applyStock={applyStock}
            setApplyStock={setApplyStock}
            hasEstimates={hasEstimates}
            inventoryMatch={inventoryMatch}
            theoreticalTotal={theoreticalSum.total}
            purchaseTotal={purchaseSum.total}
            portionCount={portionCount}
            sortedIngredients={sortedIngredients}
            estimates={estimates}
            units={uniqueUnits(ingredients)}
            globalRatios={globalRatios}
          />
        </aside>

        {recipeStats.length > 0 && (
          <div className="grid auto-cols-fr grid-flow-col gap-2 lg:col-start-1">
            {recipeStats.map((stat) => (
              <RecipeStatItem
                key={stat.key}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
                compact
              />
            ))}
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-10 lg:col-start-1">
          <RecipeStepsSection
            sortedSteps={sortedSteps}
            totalMinutes={totalMinutes}
            prepMinutes={recipe.prepMinutes}
            cookMinutes={recipe.cookMinutes}
          />
          {macroEstimate.perServing && (
            <RecipeMacrosPanel macroEstimate={macroEstimate} portions={portions} />
          )}
        </div>
      </div>
    </section>
  );
}
