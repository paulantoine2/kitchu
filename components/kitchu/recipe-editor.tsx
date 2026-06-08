"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { effectiveToBaseFactor, globalConversionFactor, pricePerBaseUnit } from "@/lib/conversions";
import { formatCurrency, formatNumber } from "@/lib/utils";
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
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { HelloFreshImportResult } from "@/lib/hellofresh";
import { suggestedBaseUnitCode } from "@/lib/hellofresh/units";
import {
  blankIngredient,
  blankRecipeIngredient,
  key,
} from "@/components/kitchu/drafts";
import { isIngredientDraftDirty } from "@/components/kitchu/draft-dirty";
import { UnsavedChangesDialog } from "@/components/kitchu/unsaved-changes-dialog";
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
import { move, standardUnitForPrice } from "@/components/kitchu/utils";

const KNOWN_STORES = ["Leclerc", "Carrefour", "Intermarché", "Primeur"] as const;
const knownStoreSet = new Set<string>(KNOWN_STORES);

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
    baseline: IngredientDraft;
  } | null>(null);
  const [ingredientLeaveDialogOpen, setIngredientLeaveDialogOpen] = useState(false);

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

  function updateDialogProduct(
    productKey: string,
    patch: Partial<IngredientDraft["products"][number]>,
  ) {
    setIngredientDialog((current) => {
      if (!current) return current;
      return {
        ...current,
        draft: {
          ...current.draft,
          products: current.draft.products.map((product) =>
            product.key === productKey ? { ...product, ...patch } : product,
          ),
        },
      };
    });
  }

  function addDialogProduct() {
    setIngredientDialog((current) => {
      if (!current) return current;
      const suggestedUnit = current.suggestedUnitCode
        ? units.find((unit) => unit.code === current.suggestedUnitCode)
        : undefined;
      return {
        ...current,
        draft: {
          ...current.draft,
          products: [
            {
              key: key(),
              store: "",
              brand: "",
              name: current.draft.name,
              imageUrl: current.draft.imageUrl,
              packageQuantity: "",
              packageUnitId: suggestedUnit?.id ?? current.draft.baseUnitId,
              packageToBaseFactor: "",
              price: "",
              url: "",
              barcode: "",
              notes: "",
            },
          ],
        },
      };
    });
  }

  function removeDialogProduct() {
    updateDialogDraft({ products: [] });
  }

  function isDialogProductComplete(product: IngredientDraft["products"][number] | undefined) {
    if (!product) return true;
    if (
      !product.store.trim() ||
      !product.name.trim() ||
      !product.packageQuantity ||
      Number(product.packageQuantity) <= 0 ||
      !product.packageUnitId ||
      product.price === "" ||
      Number(product.price) < 0
    ) {
      return false;
    }
    const packageUnit = units.find((unit) => unit.id === product.packageUnitId);
    const baseUnit = units.find((unit) => unit.id === ingredientDialog?.draft.baseUnitId);
    return (
      effectiveToBaseFactor(packageUnit, baseUnit, product.packageToBaseFactor, globalRatios, {
        allowSpecific: true,
        units,
      }) !== null
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
    const initialDraft = ingredientDraftFromRecipeRow(row);
    setIngredientDialog({
      rowKey: row.key,
      suggestedUnitCode: row.suggestedUnitCode,
      draft: initialDraft,
      baseline: initialDraft,
    });
  }

  function closeIngredientDialog() {
    setIngredientDialog(null);
    setIngredientLeaveDialogOpen(false);
  }

  function requestCloseIngredientDialog() {
    if (
      ingredientDialog &&
      isIngredientDraftDirty(ingredientDialog.draft, ingredientDialog.baseline)
    ) {
      setIngredientLeaveDialogOpen(true);
      return;
    }
    closeIngredientDialog();
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

  function selectRecipeUnit(rowKey: string, unitId: string) {
    updateRow(rowKey, unitId ? { unitId, importStatus: undefined } : { unitId });
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

  function handleIngredientInputChange(
    row: RecipeDraftIngredient,
    value: string,
    reason: string,
  ) {
    if (
      value === "" &&
      reason === "input-clear" &&
      !row.ingredientId &&
      row.ingredientName.trim()
    ) {
      return "cancel" as const;
    }
    updateIngredientInput(row.key, value);
  }

  const importIssues = draft.ingredients.filter(
    (row) => row.importStatus && row.importStatus !== "matched",
  ).length;
  const dialogBaseUnit = ingredientDialog
    ? units.find((unit) => unit.id === ingredientDialog.draft.baseUnitId)
    : undefined;
  const dialogMeasurementOptions = baseMeasurementOptions(units);
  const dialogProduct = ingredientDialog?.draft.products[0];
  const dialogProductUnit = dialogProduct
    ? units.find((unit) => unit.id === dialogProduct.packageUnitId)
    : undefined;
  const dialogProductUsesSystemRatio =
    dialogProductUnit && dialogBaseUnit
      ? globalConversionFactor(dialogProductUnit, dialogBaseUnit, globalRatios, units) !== null
      : false;
  const dialogProductEffectiveFactor =
    dialogProductUnit && dialogBaseUnit
      ? effectiveToBaseFactor(
          dialogProductUnit,
          dialogBaseUnit,
          dialogProduct?.packageToBaseFactor,
          globalRatios,
          { allowSpecific: true, units },
        )
      : null;
  const dialogProductDerivedPrice =
    dialogProduct && dialogProductEffectiveFactor
      ? pricePerBaseUnit(
          Number(dialogProduct.price),
          Number(dialogProduct.packageQuantity),
          dialogProductEffectiveFactor,
        )
      : null;
  const dialogPreferredPriceUnit = standardUnitForPrice(dialogBaseUnit, units);
  const dialogPreferredPriceFactor =
    dialogPreferredPriceUnit && dialogBaseUnit
      ? globalConversionFactor(dialogPreferredPriceUnit, dialogBaseUnit, globalRatios, units)
      : null;
  const dialogStandardPriceUnit =
    dialogProductDerivedPrice !== null && dialogPreferredPriceFactor !== null
      ? dialogPreferredPriceUnit
      : dialogBaseUnit;
  const dialogStandardPrice =
    dialogProductDerivedPrice !== null && dialogPreferredPriceFactor !== null
      ? dialogProductDerivedPrice * dialogPreferredPriceFactor
      : dialogProductDerivedPrice;
  const dialogProductComplete = isDialogProductComplete(dialogProduct);

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <HelloFreshImporter busy={busy} onImport={onImport} onError={onImportError} />
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <EntityImage src={draftRecipeImageUrl(draft, ingredients)} label={draft.name || "Recette"} size="md" className="shrink-0" />
              <div className="min-w-0">
                <h2 className="text-xl font-semibold">{draft.id ? "Modifier la recette" : "Nouvelle recette"}</h2>
                <p className="text-sm text-muted-foreground">Les quantités sont enregistrées pour une portion.</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>
                  <X data-icon="inline-start" />
                  Fermer
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_120px]">
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
          <Field label="Description">
            <Textarea
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              className="min-h-24"
            />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Image">
              <Input
                value={draft.imageUrl}
                onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}
                placeholder="https://..."
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
              <Plus data-icon="inline-start" />
              Ligne
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {draft.ingredients.map((row, index) => {
            const ingredient = ingredientById.get(row.ingredientId);
            const allowedUnits = ingredient ? usableUnitsForIngredient(ingredient, units, globalRatios) : [];
            return (
              <div
                key={row.key}
                className={`rounded-lg border p-3 shadow-sm ${
                  row.importStatus && row.importStatus !== "matched"
                    ? "border-amber-200 bg-amber-50/50"
                    : "border-border bg-card"
                }`}
              >
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_100px_minmax(120px,150px)_minmax(0,1fr)_44px]">
                  <Field label={`Ingrédient ${index + 1}`} showLabel={false}>
                    <div className="flex min-w-0 items-center gap-2">
                      <EntityImage
                        src={ingredientImageUrl(ingredient) ?? row.ingredientImageUrl}
                        label={row.ingredientName || "Ingrédient"}
                        size="xs"
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <Combobox
                        items={ingredients}
                        value={ingredient ?? null}
                        inputValue={row.ingredientName}
                        itemToStringLabel={(item) => item.name}
                        itemToStringValue={(item) => item.name}
                        isItemEqualToValue={(a, b) => a.id === b.id}
                        onInputValueChange={(value, details) => {
                          const result = handleIngredientInputChange(row, value, details.reason);
                          if (result === "cancel") {
                            details.cancel();
                          }
                        }}
                        onValueChange={(value, details) => {
                          if (value) {
                            selectRecipeIngredient(row.key, value);
                            return;
                          }
                          if (details.reason === "clear-press") {
                            updateRow(row.key, {
                              ingredientId: "",
                              ingredientName: "",
                              unitId: "",
                              importStatus: undefined,
                            });
                          }
                        }}
                      >
                        <ComboboxInput placeholder="Chercher un ingrédient" showClear />
                        <ComboboxContent>
                          <ComboboxEmpty>Aucun ingrédient trouvé.</ComboboxEmpty>
                          <ComboboxList>
                            {(option) => (
                              <ComboboxItem key={option.id} value={option}>
                                <div className="flex min-w-0 items-center gap-3">
                                  <EntityImage src={ingredientImageUrl(option)} label={option.name} size="sm" />
                                  <div className="min-w-0">
                                    <div className="truncate font-semibold">{option.name}</div>
                                    <div className="truncate text-xs text-muted-foreground">
                                      {usableUnitsForIngredient(option, units, globalRatios).length} unités
                                    </div>
                                  </div>
                                </div>
                              </ComboboxItem>
                            )}
                          </ComboboxList>
                        </ComboboxContent>
                      </Combobox>
                      </div>
                      {row.importStatus === "ingredient_missing" && row.ingredientName.trim() && (
                        <Button
                          variant="outline"
                          size="icon"
                          title="Créer l'ingrédient"
                          onClick={() => openIngredientDialog(row)}
                          className="shrink-0"
                        >
                          <Plus data-icon="inline-start" />
                        </Button>
                      )}
                      {!row.ingredientId && row.ingredientName.trim() && row.importStatus !== "ingredient_missing" && (
                        <Button variant="outline" size="icon" onClick={() => openIngredientDialog(row)} className="shrink-0">
                          <Plus data-icon="inline-start" />
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
                    <NativeSelect
                      value={row.unitId}
                      onChange={(event) => selectRecipeUnit(row.key, event.target.value)}
                      disabled={!ingredient}
                    >
                      <option value="">Choisir</option>
                      {allowedUnits.map((item) => (
                        <option key={item.unitId} value={item.unitId}>
                          {item.unit.symbol}
                        </option>
                      ))}
                    </NativeSelect>
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
                      <Trash2 />
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
              <Plus data-icon="inline-start" />
              Étape
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {draft.steps.map((step, index) => (
            <div key={step.key} className="flex gap-2 sm:grid sm:grid-cols-[34px_1fr_auto] sm:items-center">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground sm:size-10">
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
                className="min-w-0"
              />
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDraft((current) => ({ ...current, steps: move(current.steps, index, index - 1) }))}
                  disabled={index === 0}
                >
                  <GripVertical />
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
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(ingredientDialog)}
        onOpenChange={(open) => !open && requestCloseIngredientDialog()}
      >
        <DialogContent>
          {ingredientDialog && (
            <>
              <DialogHeader>
                <DialogTitle>Créer l&apos;ingrédient</DialogTitle>
                <DialogDescription>
                  Choisis l&apos;unité de base, puis rattache éventuellement un produit magasin pour le coût.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <EntityImage
                    src={ingredientDialog.draft.imageUrl}
                    label={ingredientDialog.draft.name || "Ingrédient"}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{ingredientDialog.draft.name || "Nouvel ingrédient"}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {ingredientDialog.suggestedUnitCode && (
                        <Badge className="bg-card">Unité HelloFresh {ingredientDialog.suggestedUnitCode}</Badge>
                      )}
                      {dialogBaseUnit && <Badge className="bg-card">Base {dialogBaseUnit.symbol}</Badge>}
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
                    <NativeSelect
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
                    </NativeSelect>
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

                <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold">Produit magasin</h4>
                      <p className="text-sm text-muted-foreground">
                        Optionnel — rattache un produit pour estimer le coût des courses.
                      </p>
                    </div>
                    {!dialogProduct ? (
                      <Button variant="secondary" size="sm" onClick={addDialogProduct} className="shrink-0">
                        <Plus data-icon="inline-start" />
                        Ajouter
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={removeDialogProduct} className="shrink-0">
                        <Trash2 data-icon="inline-start" />
                        Retirer
                      </Button>
                    )}
                  </div>

                  {dialogProduct && (
                    <div className="mt-4 flex flex-col gap-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Magasin">
                          <NativeSelect
                            value={dialogProduct.store}
                            onChange={(event) =>
                              updateDialogProduct(dialogProduct.key, { store: event.target.value })
                            }
                          >
                            <option value="">Choisir</option>
                            {KNOWN_STORES.map((store) => (
                              <option key={store} value={store}>
                                {store}
                              </option>
                            ))}
                            {dialogProduct.store && !knownStoreSet.has(dialogProduct.store) && (
                              <option value={dialogProduct.store}>{dialogProduct.store}</option>
                            )}
                          </NativeSelect>
                        </Field>
                        <Field label="Produit">
                          <Input
                            value={dialogProduct.name}
                            onChange={(event) =>
                              updateDialogProduct(dialogProduct.key, { name: event.target.value })
                            }
                          />
                        </Field>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Field label="Qté colis">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={dialogProduct.packageQuantity}
                            onChange={(event) =>
                              updateDialogProduct(dialogProduct.key, { packageQuantity: event.target.value })
                            }
                          />
                        </Field>
                        <Field label="Unité">
                          <NativeSelect
                            value={dialogProduct.packageUnitId}
                            onChange={(event) =>
                              updateDialogProduct(dialogProduct.key, {
                                packageUnitId: event.target.value,
                                packageToBaseFactor:
                                  globalConversionFactor(
                                    units.find((item) => item.id === event.target.value),
                                    dialogBaseUnit,
                                    globalRatios,
                                    units,
                                  ) !== null
                                    ? ""
                                    : dialogProduct.packageToBaseFactor,
                              })
                            }
                          >
                            <option value="">Choisir</option>
                            {units.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.symbol}
                              </option>
                            ))}
                          </NativeSelect>
                        </Field>
                        <Field label="Prix colis">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={dialogProduct.price}
                            onChange={(event) =>
                              updateDialogProduct(dialogProduct.key, { price: event.target.value })
                            }
                          />
                        </Field>
                      </div>
                      {!dialogProductUsesSystemRatio && dialogProductUnit && dialogBaseUnit && (
                        <Field label="Ratio produit">
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={dialogProduct.packageToBaseFactor}
                            placeholder={`ex. ${formatNumber(1)} ${dialogBaseUnit.symbol} / ${dialogProductUnit.symbol}`}
                            onChange={(event) =>
                              updateDialogProduct(dialogProduct.key, {
                                packageToBaseFactor: event.target.value,
                              })
                            }
                          />
                        </Field>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        {dialogStandardPrice !== null && dialogStandardPriceUnit ? (
                          <Badge className="border-primary/20 bg-primary/10 text-primary">
                            {formatCurrency(dialogStandardPrice)} / {dialogStandardPriceUnit.symbol}
                          </Badge>
                        ) : dialogProduct.packageQuantity && dialogProduct.price ? (
                          <Badge variant="outline">
                            {dialogProductUsesSystemRatio
                              ? "Complète les champs du produit"
                              : "Ratio produit requis"}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={requestCloseIngredientDialog} disabled={busy}>
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
                      closeIngredientDialog,
                    )
                  }
                  disabled={
                    busy ||
                    !ingredientDialog.draft.name.trim() ||
                    !ingredientDialog.draft.baseUnitId ||
                    !dialogProductComplete
                  }
                >
                  <Plus data-icon="inline-start" />
                  Créer
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={ingredientLeaveDialogOpen}
        onOpenChange={setIngredientLeaveDialogOpen}
        onConfirm={closeIngredientDialog}
      />

      <StickySave
        busy={busy}
        notice={notice}
        onSave={onSave}
        onDelete={draft.id ? onDelete : undefined}
      />
    </section>
  );
}
