"use client";

import { Clock, ExternalLink, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { convertToBase, effectiveToBaseFactor, scaleQuantity } from "@/lib/conversions";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { recipeToDraft } from "@/components/kitchu/drafts";
import { ingredientImageUrl, recipeImageUrl } from "@/components/kitchu/images";
import {
  estimateRecipeCosts,
  formatCheapestProductRatio,
  sumNullable,
  type RecipeCostEstimate,
} from "@/components/kitchu/recipe-cost";
import type { IngredientRecord, RecipeRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";
import { EntityImage, Field } from "@/components/kitchu/ui/shared";
import { uniqueUnits } from "@/components/kitchu/utils";

export function RecipeView({
  recipe,
  units,
  ingredients,
  globalRatios,
  portions,
  setPortions,
  onEdit,
}: {
  recipe: RecipeRecord;
  units: UnitRecord[];
  ingredients: IngredientRecord[];
  globalRatios: UnitRatioRecord[];
  portions: number;
  setPortions: (value: number) => void;
  onEdit: () => void;
}) {
  const draft = recipeToDraft(recipe);
  const estimates = estimateRecipeCosts(draft, ingredients, portions, globalRatios, units);
  const sortedIngredients = recipe.ingredients.slice().sort((a, b) => a.position - b.position);
  const sortedSteps = recipe.steps.slice().sort((a, b) => a.position - b.position);
  const totalMinutes = (recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0);
  const heroImageUrl = recipeImageUrl(recipe);

  return (
    <section className="space-y-6">
      <Card className="overflow-hidden">
        <div className="grid md:grid-cols-[minmax(260px,360px)_1fr]">
          <div className="relative min-h-64 bg-primary/10">
            {heroImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={heroImageUrl} alt={recipe.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full min-h-64 items-center justify-center text-5xl font-semibold text-primary">
                {recipe.name.trim().charAt(0).toUpperCase() || "K"}
              </div>
            )}
          </div>
          <div>
            <CardHeader className="border-b-0">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary">Recette sélectionnée</p>
                  <h2 className="mt-1 text-3xl font-semibold leading-tight">{recipe.name}</h2>
                  {recipe.description && (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{recipe.description}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge>{sortedIngredients.length} ingrédients</Badge>
                    <Badge>{sortedSteps.length} étapes</Badge>
                    {totalMinutes > 0 && (
                      <Badge>
                        <Clock className="h-3.5 w-3.5" />
                        {totalMinutes} min
                      </Badge>
                    )}
                    {recipe.sourceUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" />
                        }
                      >
                        <ExternalLink data-icon="inline-start" />
                        Source
                      </Button>
                    )}
                  </div>
                </div>
                <Button onClick={onEdit}>
                  <Pencil className="h-4 w-4" />
                  Modifier
                </Button>
              </div>
            </CardHeader>
            <CardContent className="border-t border-border">
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Portions">
                  <Input
                    type="number"
                    min={1}
                    value={portions}
                    onChange={(event) => setPortions(Number(event.target.value) || 1)}
                    className="w-24 rounded-full"
                  />
                </Field>
                {recipe.prepMinutes !== null && <Badge>Préparation {recipe.prepMinutes} min</Badge>}
                {recipe.cookMinutes !== null && <Badge>Cuisson {recipe.cookMinutes} min</Badge>}
              </div>
            </CardContent>
          </div>
        </div>
      </Card>

      <RecipeCostCard
        estimates={estimates}
        portions={portions}
        units={uniqueUnits(ingredients)}
        globalRatios={globalRatios}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Ingrédients</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedIngredients.map((item) => {
              const baseFactor = effectiveToBaseFactor(
                item.unit,
                item.ingredient.baseUnit,
                item.ingredient.units.find((entry) => entry.unitId === item.unitId)?.toBaseFactor,
                globalRatios,
                { allowSpecific: true, units },
              );
              const baseQuantity = convertToBase(item.quantityPerServing, baseFactor);
              return (
                <div key={item.id} className="flex gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
                  <EntityImage src={ingredientImageUrl(item.ingredient)} label={item.ingredient.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{item.ingredient.name}</span>
                      <Badge className="bg-primary/10 text-primary">
                        {formatNumber(scaleQuantity(item.quantityPerServing, portions))} {item.unit.symbol}
                      </Badge>
                      {baseQuantity !== null && (
                        <Badge>
                          {formatNumber(scaleQuantity(baseQuantity, portions))} {item.ingredient.baseUnit.symbol}
                        </Badge>
                      )}
                    </div>
                    {item.note && <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold">Étapes</h3>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedSteps.map((step, index) => (
              <div key={step.id} className="grid gap-3 rounded-lg border border-border bg-card p-3 shadow-sm md:grid-cols-[34px_1fr]">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <p className="text-sm leading-6 text-foreground">{step.instruction}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
function RecipeCostCard({
  estimates,
  portions,
  units,
  globalRatios,
}: {
  estimates: RecipeCostEstimate[];
  portions: number;
  units: UnitRecord[];
  globalRatios: UnitRatioRecord[];
}) {
  const theoreticalTotal = sumNullable(estimates.map((estimate) => estimate.theoreticalPrice));
  const purchaseTotal = sumNullable(estimates.map((estimate) => estimate.purchasePlan?.totalPrice ?? null));
  const portionCount = Math.max(1, portions);
  const hasAnyEstimate = estimates.length > 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Panier estimé</p>
            <h3 className="text-xl font-semibold">Estimation achat</h3>
            <p className="text-sm text-muted-foreground">Prix théorique et achat en produits entiers.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="border-primary/20 bg-primary/10 text-primary">
              Théorique total {theoreticalTotal === null ? "incomplet" : formatCurrency(theoreticalTotal)}
            </Badge>
            <Badge className="border-primary/20 bg-card text-primary">
              Théorique / portion{" "}
              {theoreticalTotal === null ? "incomplet" : formatCurrency(theoreticalTotal / portionCount)}
            </Badge>
            <Badge className="border-border bg-card text-foreground">
              Réel total {purchaseTotal === null ? "incomplet" : formatCurrency(purchaseTotal)}
            </Badge>
            <Badge className="border-border bg-card text-foreground">
              Réel / portion {purchaseTotal === null ? "incomplet" : formatCurrency(purchaseTotal / portionCount)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!hasAnyEstimate && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Ajoute des ingrédients pour estimer le panier.
          </div>
        )}
        {estimates.map((estimate) => (
          <div key={estimate.ingredientId} className="rounded-lg border border-border bg-card p-4 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-[1fr_135px_135px_1.4fr_120px]">
              <div className="flex items-center gap-3">
                <EntityImage
                  src={estimate.ingredientImageUrl}
                  label={estimate.ingredientName}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="truncate font-semibold">{estimate.ingredientName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Besoin {formatNumber(estimate.requiredBaseQuantity)} {estimate.baseUnit.symbol}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Théorique</div>
                <div className="mt-1 text-sm font-semibold">
                  {estimate.theoreticalPrice === null ? "Indisponible" : formatCurrency(estimate.theoreticalPrice)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Réel</div>
                <div className="mt-1 text-sm font-semibold">
                  {estimate.purchasePlan === null ? "Indisponible" : formatCurrency(estimate.purchasePlan.totalPrice)}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produits</div>
                <div className="mt-1 space-y-1">
                  {estimate.purchasePlan?.items.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-2">
                      <EntityImage src={item.product.imageUrl} label={item.product.name} size="sm" />
                      <Badge className="bg-secondary">
                        {item.count} x {item.product.name}
                      </Badge>
                    </div>
                  )) ?? <span className="text-sm text-muted-foreground">{estimate.missingReason ?? "Aucun produit"}</span>}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Restes</div>
                <div className="mt-1 text-sm font-semibold">
                  {estimate.purchasePlan
                    ? `${formatNumber(estimate.purchasePlan.leftover)} ${estimate.baseUnit.symbol}`
                    : "Indisponible"}
                </div>
              </div>
            </div>
            {estimate.cheapestProduct && (
              <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                Moins cher au ratio: {formatCheapestProductRatio(estimate, units, globalRatios)}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
