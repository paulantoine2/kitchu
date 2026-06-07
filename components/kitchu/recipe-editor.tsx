"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { HelloFreshImporter } from "@/components/hellofresh-importer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { HelloFreshImportResult } from "@/lib/hellofresh";
import { suggestedBaseUnitCode } from "@/lib/hellofresh/units";
import {
  blankIngredient,
  blankRecipeIngredient,
  key,
} from "@/components/kitchu/drafts";
import { draftRecipeImageUrl, ingredientImageUrl } from "@/components/kitchu/images";
import type {
  IngredientDraft,
  IngredientRecord,
  RecipeDraft,
  RecipeDraftIngredient,
  UnitRatioRecord,
  UnitRecord,
} from "@/components/kitchu/types";
import { EntityImage, Field, StickySave } from "@/components/kitchu/ui/shared";
import {
  baseMeasurementOptions,
  canonicalBaseUnitForKind,
  measurementKindLabel,
  usableUnitsForIngredient,
} from "@/components/kitchu/unit-helpers";
import { move } from "@/components/kitchu/utils";

export function RecipeEditor({
  draft,
  setDraft,
  ingredients,
  units,
  globalRatios,
  busy,
  notice,
  onCancel,
  onImport,
  onImportError,
  onSave,
  onDelete,
  onCreateIngredient,
  onQuickAddUnit,
}: {
  draft: RecipeDraft;
  setDraft: React.Dispatch<React.SetStateAction<RecipeDraft>>;
  ingredients: IngredientRecord[];
  units: UnitRecord[];
  globalRatios: UnitRatioRecord[];
  busy: boolean;
  notice: string;
  onCancel?: () => void;
  onImport: (result: HelloFreshImportResult) => void;
  onImportError: (message: string) => void;
  onSave: () => void;
  onDelete: () => void;
  onCreateIngredient: (
    rowKey: string,
    draft: IngredientDraft,
    options: { unitCodes?: string[] } | undefined,
    onCreated: () => void,
  ) => void;
  onQuickAddUnit: (rowKey: string, ingredientId: string, unitCode: string) => void;
}) {
  const ingredientById = new Map(ingredients.map((ingredient) => [ingredient.id, ingredient]));
  const [ingredientDialog, setIngredientDialog] = useState<{
    rowKey: string;
    suggestedUnitCode?: string;
    draft: IngredientDraft;
  } | null>(null);

  function ingredientDraftFromRecipeRow(row: RecipeDraftIngredient) {
    const baseUnitCode = suggestedBaseUnitCode(row.suggestedUnitCode ?? null);
    const baseUnit =
      units.find((unit) => unit.code === baseUnitCode) ??
      canonicalBaseUnitForKind("MASS", units) ??
      units[0];
    return {
      ...blankIngredient(baseUnit?.id ?? ""),
      name: row.ingredientName,
      imageUrl: row.ingredientImageUrl,
    };
  }

  function updateDialogDraft(patch: Partial<IngredientDraft>) {
    setIngredientDialog((current) =>
      current ? { ...current, draft: { ...current.draft, ...patch } } : current,
    );
  }

  function updateDialogBaseUnit(baseUnitId: string) {
    setIngredientDialog((current) => {
      if (!current) return current;
      const baseUnitRow = { key: key(), unitId: baseUnitId, toBaseFactor: "1" };
      return {
        ...current,
        draft: {
          ...current.draft,
          baseUnitId,
          units: current.draft.units.some((item) => item.unitId === baseUnitId)
            ? current.draft.units
            : [baseUnitRow, ...current.draft.units],
        },
      };
    });
  }

  function openIngredientDialog(row: RecipeDraftIngredient) {
    setIngredientDialog({
      rowKey: row.key,
      suggestedUnitCode: row.suggestedUnitCode,
      draft: ingredientDraftFromRecipeRow(row),
    });
  }

  function updateRow(rowKey: string, patch: Partial<RecipeDraftIngredient>) {
    setDraft((current) => ({
      ...current,
      ingredients: current.ingredients.map((item) => (item.key === rowKey ? { ...item, ...patch } : item)),
    }));
  }

  function selectRecipeIngredient(rowKey: string, ingredient: IngredientRecord) {
    const usableUnits = usableUnitsForIngredient(ingredient, units, globalRatios);
    updateRow(rowKey, {
      ingredientName: ingredient.name,
      ingredientId: ingredient.id,
      unitId: usableUnits[0]?.unitId ?? "",
      importStatus: undefined,
    });
  }

  function updateIngredientInput(rowKey: string, value: string) {
    const match = ingredients.find((ingredient) => ingredient.name.toLowerCase() === value.toLowerCase());
    const usableUnits = match ? usableUnitsForIngredient(match, units, globalRatios) : [];
    updateRow(rowKey, {
      ingredientName: value,
      ingredientId: match?.id ?? "",
      unitId: match ? usableUnits[0]?.unitId ?? "" : "",
      importStatus: match || !value.trim() ? undefined : "ingredient_missing",
    });
  }

  const importIssues = draft.ingredients.filter(
    (row) => row.importStatus && row.importStatus !== "matched",
  ).length;
  const dialogBaseUnit = ingredientDialog
    ? units.find((unit) => unit.id === ingredientDialog.draft.baseUnitId)
    : undefined;
  const dialogMeasurementOptions = baseMeasurementOptions(units);

  return (
    <section className="space-y-4">
      <HelloFreshImporter busy={busy} onImport={onImport} onError={onImportError} />
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex items-center gap-3">
              <EntityImage src={draftRecipeImageUrl(draft, ingredients)} label={draft.name || "Recette"} size="md" />
              <div>
                <h2 className="text-xl font-semibold">{draft.id ? "Modifier la recette" : "Nouvelle recette"}</h2>
                <p className="text-sm text-[#717171]">Les quantités sont enregistrées pour une portion.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  <X className="h-4 w-4" />
                  Fermer
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-[1fr_140px_140px]">
            <Field label="Titre">
              <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            </Field>
            <Field label="Préparation">
              <Input
                type="number"
                min={0}
                value={draft.prepMinutes}
                onChange={(event) => setDraft({ ...draft, prepMinutes: event.target.value })}
              />
            </Field>
            <Field label="Cuisson">
              <Input
                type="number"
                min={0}
                value={draft.cookMinutes}
                onChange={(event) => setDraft({ ...draft, cookMinutes: event.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <Field label="Image">
              <Input
                value={draft.imageUrl}
                onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}
                placeholder="https://..."
              />
            </Field>
            <Field label="Description">
              <Textarea
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </Field>
            <Field label="Source">
              <Input
                value={draft.sourceUrl}
                onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })}
                placeholder="https://..."
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Ingrédients</h3>
              {importIssues > 0 && (
                <p className="text-sm text-amber-700">
                  {importIssues} ligne(s) importée(s) nécessitent une action.
                </p>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDraft((current) => ({ ...current, ingredients: [...current.ingredients, blankRecipeIngredient()] }))}
            >
              <Plus className="h-4 w-4" />
              Ligne
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {draft.ingredients.map((row, index) => {
            const ingredient = ingredientById.get(row.ingredientId);
            const allowedUnits = ingredient ? usableUnitsForIngredient(ingredient, units, globalRatios) : [];
            return (
              <div
                key={row.key}
                className={`rounded-lg border p-3 shadow-sm ${
                  row.importStatus && row.importStatus !== "matched"
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-[#eeeeee] bg-white"
                }`}
              >
                <div className="grid gap-3 xl:grid-cols-[1.4fr_110px_150px_1fr_44px]">
                  <Field label={`Ingrédient ${index + 1}`} showLabel={false}>
                    <div className="flex gap-2">
                      <EntityImage
                        src={ingredientImageUrl(ingredient) ?? row.ingredientImageUrl}
                        label={row.ingredientName || "Ingrédient"}
                        size="sm"
                      />
                      <Combobox
                        items={ingredients}
                        value={ingredient ?? null}
                        inputValue={row.ingredientName}
                        itemToStringValue={(item) => item.name}
                        onInputValueChange={(value) => updateIngredientInput(row.key, value)}
                        onValueChange={(value) => value && selectRecipeIngredient(row.key, value)}
                      >
                        <ComboboxInput placeholder="Chercher un ingrédient" showClear />
                        <ComboboxContent>
                          <ComboboxEmpty>Aucun ingrédient trouvé.</ComboboxEmpty>
                          <ComboboxList<IngredientRecord>>
                            {(option) => (
                              <ComboboxItem key={option.id} value={option}>
                                <div className="flex min-w-0 items-center gap-3">
                                  <EntityImage src={ingredientImageUrl(option)} label={option.name} size="sm" />
                                  <div className="min-w-0">
                                    <div className="truncate font-semibold">{option.name}</div>
                                    <div className="truncate text-xs text-[#717171]">
                                      {usableUnitsForIngredient(option, units, globalRatios).length} unités
                                    </div>
                                  </div>
                                </div>
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                      {row.importStatus === "ingredient_missing" && row.ingredientName.trim() && (
                        <Button
                          variant="outline"
                          size="icon"
                          title="Créer l'ingrédient"
                          onClick={() => openIngredientDialog(row)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                      {!row.ingredientId && row.ingredientName.trim() && row.importStatus !== "ingredient_missing" && (
                        <Button variant="outline" size="icon" onClick={() => openIngredientDialog(row)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Field>
                  <Field label="Qté / portion" showLabel={false}>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.quantityPerServing}
                      onChange={(event) => updateRow(row.key, { quantityPerServing: event.target.value })}
                      placeholder="Qté"
                    />
                  </Field>
                  <Field label="Unité" showLabel={false}>
                    <Select
                      value={row.unitId}
                      onChange={(event) => updateRow(row.key, { unitId: event.target.value })}
                      disabled={!ingredient}
                    >
                      <option value="">Choisir</option>
                      {allowedUnits.map((item) => (
                        <option key={item.unitId} value={item.unitId}>
                          {item.unit.symbol}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Note" showLabel={false}>
                    <Input
                      value={row.note}
                      onChange={(event) => updateRow(row.key, { note: event.target.value })}
                      placeholder="Note"
                    />
                  </Field>
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          ingredients: current.ingredients.filter((item) => item.key !== row.key),
                        }))
                      }
                      disabled={draft.ingredients.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {row.importStatus === "unit_missing" && row.ingredientId && row.suggestedUnitCode && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onQuickAddUnit(row.key, row.ingredientId, row.suggestedUnitCode!)}
                    >
                      Ajouter l&apos;unité {row.suggestedUnitCode}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Étapes</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDraft((current) => ({ ...current, steps: [...current.steps, { key: key(), instruction: "" }] }))}
            >
              <Plus className="h-4 w-4" />
              Étape
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {draft.steps.map((step, index) => (
            <div key={step.key} className="grid gap-2 md:grid-cols-[34px_1fr_92px]">
              <div className="flex h-10 items-center justify-center rounded-full bg-[#222222] text-sm font-semibold text-white">
                {index + 1}
              </div>
              <Input
                value={step.instruction}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    steps: current.steps.map((item) =>
                      item.key === step.key ? { ...item, instruction: event.target.value } : item,
                    ),
                  }))
                }
              />
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDraft((current) => ({ ...current, steps: move(current.steps, index, index - 1) }))}
                  disabled={index === 0}
                >
                  <GripVertical className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      steps: current.steps.filter((item) => item.key !== step.key),
                    }))
                  }
                  disabled={draft.steps.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={Boolean(ingredientDialog)} onOpenChange={(open) => !open && setIngredientDialog(null)}>
        <DialogContent>
          {ingredientDialog && (
            <>
              <DialogHeader>
                <DialogTitle>Créer l&apos;ingrédient</DialogTitle>
                <DialogDescription>
                  Choisis l&apos;unité de base avant de rattacher cet ingrédient à la recette.
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="flex items-center gap-3 rounded-lg border border-[#eeeeee] bg-[#fffdfb] p-3">
                  <EntityImage
                    src={ingredientDialog.draft.imageUrl}
                    label={ingredientDialog.draft.name || "Ingrédient"}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{ingredientDialog.draft.name || "Nouvel ingrédient"}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {ingredientDialog.suggestedUnitCode && (
                        <Badge className="bg-white">Unité HelloFresh {ingredientDialog.suggestedUnitCode}</Badge>
                      )}
                      {dialogBaseUnit && <Badge className="bg-white">Base {dialogBaseUnit.symbol}</Badge>}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  <Field label="Nom">
                    <Input
                      value={ingredientDialog.draft.name}
                      onChange={(event) => updateDialogDraft({ name: event.target.value })}
                    />
                  </Field>
                  <Field label="Unité de base">
                    <Select
                      value={dialogBaseUnit?.kind ?? ""}
                      onChange={(event) => {
                        const canonicalUnit = canonicalBaseUnitForKind(event.target.value, units);
                        if (canonicalUnit) updateDialogBaseUnit(canonicalUnit.id);
                      }}
                    >
                      {dialogMeasurementOptions.map(({ kind, unit }) => (
                        <option key={kind} value={kind}>
                          {measurementKindLabel(kind)} ({unit.symbol})
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <Field label="Image">
                  <Input
                    value={ingredientDialog.draft.imageUrl}
                    onChange={(event) => updateDialogDraft({ imageUrl: event.target.value })}
                    placeholder="https://..."
                  />
                </Field>
                <Field label="Notes">
                  <Textarea
                    value={ingredientDialog.draft.notes}
                    onChange={(event) => updateDialogDraft({ notes: event.target.value })}
                  />
                </Field>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIngredientDialog(null)} disabled={busy}>
                  Annuler
                </Button>
                <Button
                  onClick={() =>
                    onCreateIngredient(
                      ingredientDialog.rowKey,
                      ingredientDialog.draft,
                      {
                        unitCodes: ingredientDialog.suggestedUnitCode
                          ? [ingredientDialog.suggestedUnitCode]
                          : undefined,
                      },
                      () => setIngredientDialog(null),
                    )
                  }
                  disabled={busy || !ingredientDialog.draft.name.trim() || !ingredientDialog.draft.baseUnitId}
                >
                  <Plus className="h-4 w-4" />
                  Créer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <StickySave
        busy={busy}
        notice={notice}
        onSave={onSave}
        onDelete={draft.id ? onDelete : undefined}
      />
    </section>
  );
}
