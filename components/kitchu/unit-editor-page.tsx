"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { deleteUnit, deleteUnitRatio, saveUnit, saveUnitRatio } from "@/app/actions";
import { blankUnit, unitToDraft } from "@/components/kitchu/drafts";
import { isUnitDraftDirty } from "@/components/kitchu/draft-dirty";
import { KitchuShell } from "@/components/kitchu/kitchu-shell";
import { toUnitPayload } from "@/components/kitchu/payloads";
import { UnitEditor } from "@/components/kitchu/unit-editor";
import { useKitchuCart } from "@/components/kitchu/use-kitchu-cart";
import { UnsavedChangesDialog } from "@/components/kitchu/unsaved-changes-dialog";
import { useBeforeUnloadWarning } from "@/components/kitchu/use-unsaved-changes";
import type { KitchuAppProps, UnitDraft, UnitRecord } from "@/components/kitchu/types";
import { Button } from "@/components/ui/button";

export function UnitEditorPage({
  initialUnit,
  ...props
}: KitchuAppProps & { initialUnit: UnitRecord | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { cartOpen, setCartOpen, cart } = useKitchuCart(props);
  const [unitDraft, setUnitDraft] = useState<UnitDraft>(() =>
    initialUnit ? unitToDraft(initialUnit) : blankUnit(),
  );
  const [notice, setNotice] = useState("");
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const baselineDraft = initialUnit ? unitToDraft(initialUnit) : blankUnit();
  const hasUnsavedChanges = isUnitDraftDirty(unitDraft, baselineDraft);

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

  return (
    <KitchuShell
      cartOpen={cartOpen}
      onCartOpenChange={setCartOpen}
      cartItemCount={cart.itemCount}
      cartSummary={cart.summary}
      onCartPortionsChange={cart.setPortions}
      onCartRemoveRecipe={cart.remove}
    >
      <div className="mx-auto max-w-[1480px] px-4 py-8 lg:px-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2"
          onClick={() => guardNavigation(() => router.push("/units"))}
        >
          <ArrowLeft data-icon="inline-start" />
          Retour aux unités
        </Button>
        <UnitEditor
          draft={unitDraft}
          setDraft={setUnitDraft}
          units={props.units}
          ingredients={props.ingredients}
          recipes={props.recipes}
          globalRatios={props.globalRatios}
          busy={isPending}
          notice={notice}
          onSave={() =>
            runAction(async () => {
              const result = await saveUnit(toUnitPayload(unitDraft));
              if (result.ok) {
                refreshWithNotice("Unité enregistrée.");
                router.push(`/units/${result.id}`);
              } else {
                setNotice(result.error);
              }
            })
          }
          onDelete={() =>
            unitDraft.id &&
            runAction(async () => {
              const result = await deleteUnit(unitDraft.id!, { force: true });
              if (result.ok) {
                refreshWithNotice("Unité supprimée.");
                router.push("/units");
              } else {
                setNotice(result.error);
              }
            })
          }
          onSaveRatio={(payload) =>
            runAction(async () => {
              const result = await saveUnitRatio(payload);
              if (result.ok) {
                refreshWithNotice("Ratio configurable enregistré.");
              } else {
                setNotice(result.error);
              }
            })
          }
          onDeleteRatio={(id) =>
            runAction(async () => {
              const result = await deleteUnitRatio(id);
              if (result.ok) {
                refreshWithNotice("Ratio configurable supprimé.");
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
