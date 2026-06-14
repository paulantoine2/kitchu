"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronDown, Clock, Flame, Scale, ShoppingCart } from "lucide-react";
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

function isCoveredByInventory(estimate: RecipeCostEstimate, applyStock: boolean) {
  return (
    applyStock &&
    estimate.toPurchaseBaseQuantity === 0 &&
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

  if (applyStock && estimate.toPurchaseBaseQuantity > 0) {
    return {
      label: `À acheter ${formatNumber(estimate.toPurchaseBaseQuantity)} ${estimate.baseUnit.symbol}`,
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
  showPurchaseDetails,
  applyStock,
  isPrimaryIngredientRow,
}: {
  item: RecipeIngredientRow;
  quantity: ReturnType<typeof formatIngredientQuantity>;
  estimate: RecipeCostEstimate | undefined;
  showPurchaseDetails: boolean;
  applyStock: boolean;
  isPrimaryIngredientRow: boolean;
}) {
  const purchaseSummary = estimate ? compactPurchaseSummary(estimate, applyStock) : null;

  const compactRow = (
    <div className="flex items-start gap-3 p-3">
      <ItemMedia variant="image">
        <EntityImage src={ingredientImageUrl(item.ingredient)} label={item.ingredient.name} size="xs" />
      </ItemMedia>
      <ItemContent className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0 flex-1">
            <ItemTitle className="text-base font-semibold">
              {isPrimaryIngredientRow ? (
                <Link href={ingredientHref(item.ingredient.id)} className={entityLinkClassName}>
                  {item.ingredient.name}
                </Link>
              ) : (
                <span>{item.ingredient.name}</span>
              )}
            </ItemTitle>
            {purchaseSummary && (
              <p className="mt-0.5 text-sm text-muted-foreground">{purchaseSummary.label}</p>
            )}
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <div className="flex flex-col items-end gap-0.5 text-right">
              <span className="text-sm font-semibold text-primary">{quantity.primary}</span>
              {quantity.secondary && (
                <span className="text-xs text-muted-foreground">{quantity.secondary}</span>
              )}
              {purchaseSummary?.price && (
                <span className="text-sm font-semibold tabular-nums">{purchaseSummary.price}</span>
              )}
            </div>
            {showPurchaseDetails && estimate && (
              <CollapsibleTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0"
                    aria-label={`Détail d'achat pour ${item.ingredient.name}`}
                  />
                }
              >
                <ChevronDown />
              </CollapsibleTrigger>
            )}
          </div>
        </div>
        {item.note && <ItemDescription className="mt-1">{item.note}</ItemDescription>}
      </ItemContent>
    </div>
  );

  const itemClassName =
    "flex-col items-stretch gap-0 rounded-xl p-0 transition-colors duration-150 hover:bg-muted/40";

  if (!showPurchaseDetails || !estimate) {
    return (
      <Item size="sm" className={itemClassName}>
        {compactRow}
      </Item>
    );
  }

  return (
    <Collapsible>
      <Item size="sm" className={itemClassName}>
        {compactRow}
        <CollapsibleContent className="flex flex-col">
          <Separator className="opacity-60" />
          <ItemFooter className="p-3 pt-2.5">
            <IngredientPurchaseDetails estimate={estimate} ingredient={item.ingredient} applyStock={applyStock} />
          </ItemFooter>
        </CollapsibleContent>
      </Item>
    </Collapsible>
  );
}

function RecipeStatItem({
  value,
  label,
  detail,
  icon,
}: {
  value: ReactNode;
  label: string;
  detail?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex min-h-28 flex-col justify-between gap-4 rounded-2xl bg-card p-4 shadow-soft ring-1 ring-foreground/[0.05] dark:ring-foreground/[0.08]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {icon && (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            {icon}
          </div>
        )}
      </div>
      <div>
        <p className="text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">{value}</p>
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
    <RecipeSidebarPanel
      title="Coûts estimés"
      description={`Pour ${portionCount} portion${portionCount > 1 ? "s" : ""}`}
      unified={unified}
    >
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

function RecipeStepsSection({ sortedSteps }: { sortedSteps: RecipeRecord["steps"] }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Étapes</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {sortedSteps.length} étape{sortedSteps.length > 1 ? "s" : ""} de préparation
        </p>
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
    estimate.toPurchaseBaseQuantity === 0 &&
    (estimate.stockUsed > 0 || estimate.cartLeftoverUsed > 0);
  const partiallyCovered =
    applyStock &&
    (estimate.stockUsed > 0 || estimate.cartLeftoverUsed > 0) &&
    estimate.toPurchaseBaseQuantity > 0;
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
    <div className="flex w-full flex-col gap-2">
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
              <Badge variant="outline" className="gap-1.5 transition-colors hover:border-primary/40 hover:bg-primary/5">
                <ProductStorageBadge storageType={product.storageType} className="text-[10px]" />
                {formatNumber(product.stockQuantity!)} {estimate.baseUnit.symbol}
                {product.name.trim() ? ` · ${product.name}` : ""}
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
              À acheter {formatNumber(estimate.toPurchaseBaseQuantity)} {estimate.baseUnit.symbol}
            </Badge>
          )}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-md bg-muted/40 px-2.5 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Théorique</p>
          <p className="mt-0.5 text-sm font-semibold">
            {estimate.theoreticalPrice === null ? "—" : formatCurrency(estimate.theoreticalPrice)}
          </p>
        </div>
        <div className="rounded-md bg-muted/40 px-2.5 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Achat réel</p>
          <p className="mt-0.5 text-sm font-semibold">
            {coveredByInventory
              ? formatCurrency(0)
              : purchasePlan
                ? formatCurrency(purchasePlan.totalPrice)
                : "—"}
          </p>
        </div>
        <div className="rounded-md bg-muted/40 px-2.5 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Restes</p>
          <p className="mt-0.5 text-sm font-semibold">
            {coveredByInventory
              ? "—"
              : purchasePlan
                ? `${formatNumber(purchasePlan.leftover)} ${estimate.baseUnit.symbol}`
                : "—"}
          </p>
        </div>
      </div>
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
                  "flex w-full items-center gap-3 rounded-xl bg-muted/50 p-3 transition-colors duration-150 hover:bg-accent",
                  entityLinkClassName,
                )}
              >
                <EntityImage
                  src={productItem.product.imageUrl}
                  label={productLabel}
                  size="sm"
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold leading-snug">{productLabel}</span>
                    <ProductStorageBadge storageType={productItem.product.storageType} className="text-[10px]" />
                  </div>
                  {productMeta && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{productMeta}</p>
                  )}
                  <p className="mt-1 text-sm font-medium">
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
  weightEstimate,
  unified,
}: {
  sortedIngredients: RecipeIngredientRow[];
  estimates: RecipeCostEstimate[];
  portions: number;
  units: UnitRecord[];
  globalRatios: UnitRatioRecord[];
  applyStock: boolean;
  weightEstimate: ReturnType<typeof estimateRecipeWeightPerServing>;
  unified?: boolean;
}) {
  const estimateByIngredientId = new Map(estimates.map((estimate) => [estimate.ingredientId, estimate]));
  const firstRowByIngredientId = new Map<string, string>();
  for (const item of sortedIngredients) {
    if (!firstRowByIngredientId.has(item.ingredientId)) {
      firstRowByIngredientId.set(item.ingredientId, item.id);
    }
  }

  const portionCount = Math.max(1, portions);
  const hasEstimates = estimates.length > 0;
  const totalWeightLabel =
    weightEstimate.gramsPerServing !== null
      ? formatRecipeWeight(weightEstimate.gramsPerServing * portionCount)
      : null;
  const weightPerServingLabel = formatRecipeWeight(weightEstimate.gramsPerServing);

  return (
    <RecipeSidebarPanel
      title="Ingrédients"
      description={[
        `Quantités pour ${portionCount} portion${portionCount > 1 ? "s" : ""}`,
        weightPerServingLabel
          ? ` — poids estimé ${totalWeightLabel}${portionCount > 1 ? ` (${weightPerServingLabel}/portion)` : ""}${!weightEstimate.isComplete ? " (partiel)" : ""}`
          : null,
        hasEstimates
          ? applyStock
            ? ". Détail d'achat avec stock et restes du panier déduits."
            : ". Détail d'achat par ingrédient."
          : weightPerServingLabel
            ? "."
            : null,
      ]
        .filter(Boolean)
        .join("")}
      unified={unified}
    >
      {sortedIngredients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Aucun ingrédient dans cette recette.
        </div>
      ) : (
        <ItemGroup className="-mx-1 gap-0 divide-y divide-border/50">
          {sortedIngredients.map((item) => {
            const quantity = formatIngredientQuantity(item, portions, globalRatios, units);
            const estimate = estimateByIngredientId.get(item.ingredientId);
            const isPrimaryRow = estimate && firstRowByIngredientId.get(item.ingredientId) === item.id;
            const showPurchaseDetails = Boolean(isPrimaryRow && estimate);

            return (
              <RecipeIngredientItem
                key={item.id}
                item={item}
                quantity={quantity}
                estimate={estimate}
                showPurchaseDetails={showPurchaseDetails}
                applyStock={applyStock}
                isPrimaryIngredientRow={Boolean(isPrimaryRow)}
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
  weightEstimate,
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
  weightEstimate: ReturnType<typeof estimateRecipeWeightPerServing>;
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
        weightEstimate={weightEstimate}
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
  const macroCaloriesLabel = formatMacroCalories(macroEstimate.perServing?.calories ?? null);

  return (
    <section className="flex min-w-0 animate-fade-in flex-col gap-8 lg:gap-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:gap-x-10 lg:gap-y-8 lg:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="min-w-0">
            <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
              {recipe.name}
            </h1>
            {recipe.description && (
              <p className="mt-4 max-w-3xl text-[15px] leading-7 text-muted-foreground sm:text-base">
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
            weightEstimate={weightEstimate}
          />
        </aside>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-start-1 lg:grid-cols-3">
          {totalMinutes > 0 && (
            <RecipeStatItem
              value={`${totalMinutes} min`}
              label="Durée totale"
              detail={
                recipe.prepMinutes !== null && recipe.cookMinutes !== null
                  ? `${recipe.prepMinutes} prépa · ${recipe.cookMinutes} cuisson`
                  : undefined
              }
              icon={<Clock />}
            />
          )}
          {weightPerServingLabel && (
            <RecipeStatItem
              value={weightPerServingLabel}
              label="Poids / portion"
              detail={!weightEstimate.isComplete ? "Estimation partielle" : undefined}
              icon={<Scale />}
            />
          )}
          {macroCaloriesLabel && (
            <RecipeStatItem
              value={macroCaloriesLabel}
              label="Calories / portion"
              detail={!macroEstimate.isComplete ? "Estimation partielle" : undefined}
              icon={<Flame />}
            />
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-10 lg:col-start-1">
          <RecipeStepsSection sortedSteps={sortedSteps} />
          {macroEstimate.perServing && (
            <RecipeMacrosPanel macroEstimate={macroEstimate} portions={portions} />
          )}
        </div>
      </div>
    </section>
  );
}
