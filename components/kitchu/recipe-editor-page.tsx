"use client";

import { useState, useTransition } from "react";
import { useKitchuRouter } from "@/components/use-kitchu-router";
import { ArrowLeft } from "lucide-react";
import {
  addIngredientUnitQuick,
  deleteRecipe,
  saveIngredient,
  saveRecipe,
} from "@/app/actions";
import {
  blankRecipe,
  helloFreshImportToDraft,
  recipeToDraft,
} from "@/components/kitchu/drafts";
import {
  isRecipeDraftDirty,
} from "@/components/kitchu/draft-dirty";
import { KitchuShell } from "@/components/kitchu/kitchu-shell";
import { toIngredientPayload, toRecipePayload } from "@/components/kitchu/payloads";
import { RecipeEditor } from "@/components/kitchu/recipe-editor";
import { useKitchuCart } from "@/components/kitchu/use-kitchu-cart";
import { UnsavedChangesDialog } from "@/components/kitchu/unsaved-changes-dialog";
import { useBeforeUnloadWarning } from "@/components/kitchu/use-unsaved-changes";
import type { IngredientRecord, KitchuAppProps, RecipeDraft, RecipeRecord } from "@/components/kitchu/types";
import { usableUnitsForIngredient } from "@/components/kitchu/unit-helpers";
import { Button } from "@/components/ui/button";

export function RecipeEditorPage({
  initialRecipe,
  ...props
}: KitchuAppProps & { initialRecipe: RecipeRecord | null }) {
  const router = useKitchuRouter();
  const [isPending, startTransition] = useTransition();
  const { cartOpen, setCartOpen, cart } = useKitchuCart(props);
  const [allIngredients, setAllIngredients] = useState(props.ingredients);
  const [recipeDraft, setRecipeDraft] = useState<RecipeDraft>(() =>
    initialRecipe ? recipeToDraft(initialRecipe) : blankRecipe(),
  );
  const [notice, setNotice] = useState("");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const baselineDraft = initialRecipe ? recipeToDraft(initialRecipe) : blankRecipe();
  const hasUnsavedChanges = isRecipeDraftDirty(recipeDraft, baselineDraft);

  useBeforeUnloadWarning(hasUnsavedChanges);

  function guardNavigation(action: () => void) {
    if (hasUnsavedChanges) {
      setPendingNavigation(() => action);
      setLeaveDialogOpen(true);
      return;
    }
    action();
  }

  function confirmLeaveWithoutSaving() {
    pendingNavigation?.();
    setPendingNavigation(null);
    setLeaveDialogOpen(false);
  }

  function refreshWithNotice(message: string) {
    setNotice(message);
    router.refresh();
  }

  function runAction(action: () => Promise<void>) {
    startTransition(() => {
      action().catch((error) => setNotice(error instanceof Error ? error.message : "Erreur inattendue."));
    });
  }

  const backHref = initialRecipe ? `/recipes/${initialRecipe.id}` : "/recipes";

  return (
    <KitchuShell
      cartOpen={cartOpen}
      onCartOpenChange={setCartOpen}
      cartItemCount={cart.itemCount}
      cartSummary={cart.summary}
      onCartPortionsChange={cart.setPortions}
      onCartRemoveRecipe={cart.remove}
    >
      <div className="mx-auto max-w-[1120px] px-4 py-8 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2"
          onClick={() => guardNavigation(() => router.push(backHref))}
        >
          <ArrowLeft data-icon="inline-start" />
          {initialRecipe ? "Retour à la recette" : "Retour aux recettes"}
        </Button>
        <RecipeEditor
          draft={recipeDraft}
          setDraft={setRecipeDraft}
          ingredients={allIngredients}
          units={props.units}
          globalRatios={props.globalRatios}
          busy={isPending}
          notice={notice}
          onCancel={
            initialRecipe
              ? () => guardNavigation(() => router.push(backHref))
              : () => guardNavigation(() => router.push("/recipes"))
          }
          onImport={(result) =>
            guardNavigation(() => {
              setRecipeDraft(helloFreshImportToDraft(result));
              const issues = result.matches.filter((item) => item.status !== "matched").length;
              setNotice(
                issues
                  ? `Import HelloFresh terminé. ${issues} ligne(s) à compléter.`
                  : "Import HelloFresh terminé.",
              );
            })
          }
          onImportError={setNotice}
          onSave={() =>
            runAction(async () => {
              const result = await saveRecipe(toRecipePayload(recipeDraft));
              if (result.ok) {
                refreshWithNotice("Recette enregistrée.");
                router.push(`/recipes/${result.id}`);
              } else {
                setNotice(result.error);
              }
            })
          }
          onDelete={() =>
            recipeDraft.id &&
            runAction(async () => {
              const result = await deleteRecipe(recipeDraft.id!);
              if (result.ok) {
                refreshWithNotice("Recette supprimée.");
                router.push("/recipes");
              } else {
                setNotice(result.error);
              }
            })
          }
          onCreateIngredient={(rowKey, draft, options, onCreated) =>
            runAction(async () => {
              const result = await saveIngredient(toIngredientPayload(draft, props.units, props.globalRatios));
              if (result.ok) {
                const ingredient = result.ingredient as IngredientRecord;
                setAllIngredients((current) =>
                  current.some((item) => item.id === ingredient.id)
                    ? current
                    : [...current, ingredient].sort((a, b) => a.name.localeCompare(b.name)),
                );
                setRecipeDraft((current) => ({
                  ...current,
                  ingredients: current.ingredients.map((item) => {
                    if (item.key !== rowKey) return item;
                    const usableUnits = usableUnitsForIngredient(ingredient, props.units, props.globalRatios);
                    const matchedUnit = options?.unitCodes
                      ? usableUnits.find((entry) => options.unitCodes?.includes(entry.unit.code))
                      : undefined;
                    const unitId = matchedUnit?.unitId ?? usableUnits[0]?.unitId ?? "";
                    return {
                      ...item,
                      ingredientId: ingredient.id,
                      ingredientName: ingredient.name,
                      unitId,
                      importStatus: unitId ? "matched" : item.importStatus,
                    };
                  }),
                }));
                onCreated();
                setNotice("Ingrédient créé.");
              } else {
                setNotice(result.error);
              }
            })
          }
          onQuickAddUnit={(rowKey, ingredientId, unitCode) =>
            runAction(async () => {
              const result = await addIngredientUnitQuick(ingredientId, unitCode);
              if (result.ok) {
                const ingredient = result.ingredient as IngredientRecord;
                setAllIngredients((current) =>
                  current.map((item) => (item.id === ingredient.id ? ingredient : item)),
                );
                const addedUnit = usableUnitsForIngredient(ingredient, props.units, props.globalRatios).find(
                  (entry) => entry.unit.code === unitCode,
                );
                setRecipeDraft((current) => ({
                  ...current,
                  ingredients: current.ingredients.map((item) =>
                    item.key === rowKey
                      ? {
                          ...item,
                          ingredientId: ingredient.id,
                          ingredientName: ingredient.name,
                          unitId: addedUnit?.unitId ?? item.unitId,
                          importStatus: addedUnit ? "matched" : item.importStatus,
                        }
                      : item,
                  ),
                }));
                setNotice("Unité ajoutée à l'ingrédient.");
              } else {
                setNotice(result.error);
              }
            })
          }
        />
      </div>

      <UnsavedChangesDialog
        open={leaveDialogOpen}
        onOpenChange={(open) => {
          setLeaveDialogOpen(open);
          if (!open) setPendingNavigation(null);
        }}
        onConfirm={confirmLeaveWithoutSaving}
      />
    </KitchuShell>
  );
}
