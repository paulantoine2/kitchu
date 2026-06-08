"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import type { CartPurchaseSummary, CartUsageShare } from "@/components/kitchu/cart";
import { EntityImage } from "@/components/kitchu/ui/shared";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

const USAGE_BAR_COLORS = [
  "bg-primary",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-orange-500",
  "bg-rose-500",
] as const;

const LEFTOVER_BAR_COLOR = "bg-muted-foreground/35";

type UsageSegment = {
  key: string;
  label: string;
  percent: number;
  colorClass: string;
};

function usageColorForRecipe(recipeId: string, recipeIds: string[]) {
  const index = recipeIds.indexOf(recipeId);
  return USAGE_BAR_COLORS[(index >= 0 ? index : 0) % USAGE_BAR_COLORS.length];
}

function buildUsageSegments(
  usage: CartUsageShare[],
  leftoverPercent: number,
  recipeIds: string[],
): UsageSegment[] {
  const segments: UsageSegment[] = usage
    .filter((entry) => entry.percent > 0)
    .map((entry) => ({
      key: entry.recipeId,
      label: entry.recipeName,
      percent: entry.percent,
      colorClass: usageColorForRecipe(entry.recipeId, recipeIds),
    }));

  if (leftoverPercent > 0) {
    segments.push({
      key: "leftover",
      label: "Restes",
      percent: leftoverPercent,
      colorClass: LEFTOVER_BAR_COLOR,
    });
  }

  return segments;
}

function UsageBreakdown({
  usage,
  leftoverPercent,
  recipeIds,
}: {
  usage: CartPurchaseSummary["productLines"][number]["usage"];
  leftoverPercent: number;
  recipeIds: string[];
}) {
  const segments = buildUsageSegments(usage, leftoverPercent, recipeIds);
  if (segments.length === 0) return null;

  const legend = segments
    .map((segment) => `${Math.round(segment.percent)}% ${segment.label}`)
    .join(", ");

  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/40"
        role="img"
        aria-label={`Répartition : ${legend}`}
      >
        {segments.map((segment) => (
          <div
            key={segment.key}
            className={cn(segment.colorClass, "h-full min-w-px shrink-0")}
            style={{ width: `${segment.percent}%` }}
            title={`${segment.label} · ${Math.round(segment.percent)}%`}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-1">
        {segments.map((segment) => (
          <li key={segment.key} className="flex items-center gap-2 text-xs">
            <span
              className={cn("size-2.5 shrink-0 rounded-full", segment.colorClass)}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-muted-foreground">{segment.label}</span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">
              {Math.round(segment.percent)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CartSheet({
  open,
  onOpenChange,
  summary,
  onPortionsChange,
  onRemoveRecipe,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  summary: CartPurchaseSummary;
  onPortionsChange: (recipeId: string, portions: number) => void;
  onRemoveRecipe: (recipeId: string) => void;
}) {
  const isEmpty = summary.recipeLines.length === 0;
  const recipeIds = summary.recipeLines.map((line) => line.recipeId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-2xl"
      >
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle>Panier</SheetTitle>
          <SheetDescription>
            {isEmpty
              ? "Ajoutez des recettes pour préparer votre liste d'achats."
              : `${summary.recipeLines.length} recette${summary.recipeLines.length > 1 ? "s" : ""} · restes partagés entre recettes`}
          </SheetDescription>
        </SheetHeader>

        {isEmpty ? (
          <div className="flex-1 px-4 py-10 text-center text-sm text-muted-foreground">
            Votre panier est vide.
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 py-4">
            <section className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold">Recettes</h3>
              <ItemGroup className="gap-2">
                {summary.recipeLines.map((line) => (
                  <Item key={line.recipeId} variant="outline" size="sm">
                    <ItemMedia variant="image">
                      <EntityImage src={line.recipeImageUrl} label={line.recipeName} size="xs" />
                    </ItemMedia>
                    <ItemContent className="min-w-0">
                      <ItemTitle className="truncate">{line.recipeName}</ItemTitle>
                      {line.usedMerchandiseValue !== null && (
                        <p className="text-xs tabular-nums text-muted-foreground">
                          Marchandise utilisée · {formatCurrency(line.usedMerchandiseValue)}
                        </p>
                      )}
                    </ItemContent>
                    <ItemActions className="shrink-0 items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        value={line.portions}
                        onChange={(event) => onPortionsChange(line.recipeId, Number(event.target.value) || 1)}
                        className="h-8 w-16 rounded-full bg-background text-center"
                        aria-label={`Portions pour ${line.recipeName}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onRemoveRecipe(line.recipeId)}
                        aria-label={`Retirer ${line.recipeName} du panier`}
                      >
                        <Trash2 />
                      </Button>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            </section>

            <Separator />

            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold">Produits à acheter</h3>
                {summary.totalPrice.total !== null && (
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(summary.totalPrice.total)}
                    {!summary.totalPrice.isComplete && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">· partiel</span>
                    )}
                  </p>
                )}
              </div>

              {summary.productLines.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-sm text-muted-foreground">
                  Tout est couvert par le stock disponible.
                </div>
              ) : (
                <ItemGroup className="gap-3">
                  {summary.productLines.map((line) => {
                    const lineKey = `${line.ingredientId}-${line.product.id}-${line.count}`;
                    const isMissing = Boolean(line.missingReason);

                    return (
                      <Item
                        key={lineKey}
                        variant="outline"
                        size="sm"
                        className={cn("flex-col items-stretch gap-0 p-0", isMissing && "border-amber-500/40")}
                      >
                        <div className="flex items-start gap-3 p-3">
                          <ItemMedia variant="image" className="!size-14 !rounded-lg">
                            <EntityImage
                              src={line.product.imageUrl ?? line.ingredientImageUrl}
                              label={line.product.name}
                              size="sm"
                            />
                          </ItemMedia>
                          <ItemContent className="min-w-0 flex-1">
                            <ItemTitle className="text-base">{line.product.name}</ItemTitle>
                            <p className="mt-0.5 text-xs text-muted-foreground">{line.ingredientName}</p>
                            {isMissing ? (
                              <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                                {line.missingReason}
                              </p>
                            ) : (
                              <div className="mt-2 grid gap-1 text-sm">
                                <p>
                                  {line.count > 0
                                    ? `${line.count}× ${formatNumber(line.product.packageQuantity)} ${line.product.packageUnit.symbol}`
                                    : `${formatNumber(line.totalBaseQuantity)} ${line.baseUnit.symbol}`}
                                </p>
                                <p className="text-muted-foreground">
                                  {formatCurrency(line.unitPrice)} / {line.baseUnit.symbol}
                                </p>
                              </div>
                            )}
                          </ItemContent>
                          {!isMissing && (
                            <div className="shrink-0 text-right">
                              <p className="text-base font-semibold tabular-nums">{formatCurrency(line.totalPrice)}</p>
                            </div>
                          )}
                        </div>
                        {!isMissing && (line.usage.length > 0 || line.leftoverPercent > 0) && (
                          <>
                            <Separator />
                            <div className="p-3 pt-2.5">
                              <UsageBreakdown
                                usage={line.usage}
                                leftoverPercent={line.leftoverPercent}
                                recipeIds={recipeIds}
                              />
                            </div>
                          </>
                        )}
                      </Item>
                    );
                  })}
                </ItemGroup>
              )}
            </section>
          </div>
        )}

        {!isEmpty && (
          <SheetFooter className="shrink-0 gap-3 border-t border-border bg-card/95 px-4 py-4">
            <div className="flex w-full items-center justify-between gap-3 text-sm">
              <span className="font-medium">Total à payer</span>
              <span className="text-base font-semibold tabular-nums">
                {summary.totalPrice.total !== null ? formatCurrency(summary.totalPrice.total) : "—"}
                {summary.totalPrice.total !== null && !summary.totalPrice.isComplete && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">· partiel</span>
                )}
              </span>
            </div>
            <div className="flex w-full items-center justify-between gap-3 text-sm text-muted-foreground">
              <span>Valeur des restes</span>
              <span className="font-medium tabular-nums text-foreground">
                {summary.leftoverValue.total !== null ? formatCurrency(summary.leftoverValue.total) : "—"}
              </span>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
