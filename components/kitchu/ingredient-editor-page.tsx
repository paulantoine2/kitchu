"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { deleteIngredient, saveIngredient } from "@/app/actions";
import { blankIngredient, ingredientToDraft } from "@/components/kitchu/drafts";
import { isIngredientDraftDirty } from "@/components/kitchu/draft-dirty";
import { IngredientEditor } from "@/components/kitchu/ingredient-editor";
import { KitchuShell } from "@/components/kitchu/kitchu-shell";
import { toIngredientPayload } from "@/components/kitchu/payloads";
import { useKitchuCart } from "@/components/kitchu/use-kitchu-cart";
import { UnsavedChangesDialog } from "@/components/kitchu/unsaved-changes-dialog";
import { useBeforeUnloadWarning } from "@/components/kitchu/use-unsaved-changes";
import type { IngredientDraft, IngredientRecord, KitchuAppProps } from "@/components/kitchu/types";
import { canonicalBaseUnitForKind } from "@/components/kitchu/unit-helpers";
import { Button } from "@/components/ui/button";

export function IngredientEditorPage({
  initialIngredient,
  ...props
}: KitchuAppProps & { initialIngredient: IngredientRecord | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { cartOpen, setCartOpen, cart } = useKitchuCart(props);
  const defaultBaseUnitId = canonicalBaseUnitForKind("MASS", props.units)?.id ?? props.units[0]?.id ?? "";
  const [ingredientDraft, setIngredientDraft] = useState<IngredientDraft>(() =>
    initialIngredient
      ? ingredientToDraft(initialIngredient, defaultBaseUnitId, props.units, props.globalRatios)
      : blankIngredient(defaultBaseUnitId),
  );
  const [notice, setNotice] = useState("");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const baselineDraft = initialIngredient
    ? ingredientToDraft(initialIngredient, defaultBaseUnitId, props.units, props.globalRatios)
    : blankIngredient(defaultBaseUnitId);
  const hasUnsavedChanges = isIngredientDraftDirty(ingredientDraft, baselineDraft);

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

  const backHref = "/ingredients";

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
          Retour aux ingrédients
        </Button>
        <IngredientEditor
          draft={ingredientDraft}
          setDraft={setIngredientDraft}
          units={props.units}
          globalRatios={props.globalRatios}
          busy={isPending}
          notice={notice}
          onSave={() =>
            runAction(async () => {
              const result = await saveIngredient(
                toIngredientPayload(ingredientDraft, props.units, props.globalRatios),
              );
              if (result.ok) {
                refreshWithNotice("Ingrédient enregistré.");
                router.push(`/ingredients/${result.id}`);
              } else {
                setNotice(result.error);
              }
            })
          }
          onDelete={() =>
            ingredientDraft.id &&
            runAction(async () => {
              const result = await deleteIngredient(ingredientDraft.id!);
              if (result.ok) {
                refreshWithNotice("Ingrédient supprimé.");
                router.push("/ingredients");
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
