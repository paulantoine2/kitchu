"use client";

import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { effectiveToBaseFactor, globalConversionFactor, pricePerBaseUnit, convertToBase } from "@/lib/conversions";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { key } from "@/components/kitchu/drafts";
import type { IngredientDraft, IngredientRecord, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";
import { EntityImage, Field, StickySave } from "@/components/kitchu/ui/shared";
import {
  baseMeasurementOptions,
  canDefineIngredientSpecificRatio,
  canonicalBaseUnitForKind,
  measurementKindLabel,
  usableUnitsForIngredient,
} from "@/components/kitchu/unit-helpers";
import { standardUnitForPrice, updateProduct } from "@/components/kitchu/utils";

const KNOWN_STORES = ["Leclerc", "Carrefour", "Intermarché", "Primeur"] as const;
const knownStoreSet = new Set<string>(KNOWN_STORES);

export function IngredientEditor({
  draft,
  setDraft,
  units,
  globalRatios,
  busy,
  notice,
  onSave,
  onDelete,
}: {
  draft: IngredientDraft;
  setDraft: React.Dispatch<React.SetStateAction<IngredientDraft>>;
  units: UnitRecord[];
  globalRatios: UnitRatioRecord[];
  busy: boolean;
  notice: string;
  onSave: () => void;
  onDelete: () => void;
}) {
  const baseUnit = units.find((unit) => unit.id === draft.baseUnitId);
  const measurementOptions = baseMeasurementOptions(units);
  const automaticUnitCount = baseUnit
    ? units.filter((unit) => globalConversionFactor(unit, baseUnit, globalRatios, units) !== null).length
    : 0;
  const specificRows = draft.units.filter((row) => {
    if (!row.unitId) return true;
    return canDefineIngredientSpecificRatio(
      units.find((unit) => unit.id === row.unitId),
      baseUnit,
      globalRatios,
      units,
    );
  });
  const specificUnitOptions = units.filter((unit) =>
    canDefineIngredientSpecificRatio(unit, baseUnit, globalRatios, units),
  );
  const draftAsIngredient = (): IngredientRecord => ({
    id: draft.id ?? "",
    name: draft.name,
    imageUrl: draft.imageUrl || null,
    notes: draft.notes || null,
    baseUnitId: draft.baseUnitId,
    baseUnit: baseUnit!,
    units: draft.units
      .filter((row) => row.unitId)
      .map((row) => ({
        id: row.key,
        unitId: row.unitId,
        toBaseFactor: row.toBaseFactor ? Number(row.toBaseFactor) : null,
        unit: units.find((unit) => unit.id === row.unitId)!,
      })),
    products: [],
    stock: null,
  });
  const stockUnitOptions = baseUnit ? usableUnitsForIngredient(draftAsIngredient(), units, globalRatios) : [];
  const selectedStockUnit = stockUnitOptions.find((entry) => entry.unitId === draft.stockUnitId);
  const stockBasePreview =
    draft.stockQuantity && baseUnit && selectedStockUnit
      ? convertToBase(
          Number(draft.stockQuantity),
          effectiveToBaseFactor(
            selectedStockUnit.unit,
            baseUnit,
            selectedStockUnit.toBaseFactor,
            globalRatios,
            { allowSpecific: true, units },
          ),
        )
      : null;

  function resetGlobalRows(baseUnitId: string, rows: IngredientDraft["units"]) {
    return rows.map((item) => ({ ...item, toBaseFactor: "" }));
  }

  function addBaseUnitRow(baseUnitId: string, rows: IngredientDraft["units"]) {
    return rows.some((item) => item.unitId === baseUnitId)
      ? resetGlobalRows(baseUnitId, rows)
      : [{ key: key(), unitId: baseUnitId, toBaseFactor: "" }, ...resetGlobalRows(baseUnitId, rows)];
  }

  function updateUnitChoice(rowKey: string, unitId: string) {
    setDraft((current) => ({
      ...current,
      units: current.units.map((item) =>
        item.key === rowKey
          ? {
              ...item,
              unitId,
              toBaseFactor: "",
            }
          : item,
      ),
    }));
  }

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex min-w-0 items-center gap-3">
            <EntityImage src={draft.imageUrl} label={draft.name || "Ingrédient"} size="md" className="shrink-0" />
            <h2 className="text-xl font-semibold">{draft.id ? "Modifier l'ingrédient" : "Nouvel ingrédient"}</h2>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <Field label="Nom">
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          <Field label="Type de mesure">
            <NativeSelect
              value={baseUnit?.kind ?? ""}
              onChange={(event) => {
                const canonicalUnit = canonicalBaseUnitForKind(event.target.value, units);
                if (!canonicalUnit) return;
                const baseUnitId = canonicalUnit.id;
                setDraft((current) => ({
                  ...current,
                  baseUnitId,
                  stockUnitId: baseUnitId,
                  units: addBaseUnitRow(baseUnitId, current.units),
                }));
              }}
            >
              {measurementOptions.map(({ kind, unit }) => (
                <option key={kind} value={kind}>
                  {measurementKindLabel(kind)} ({unit.symbol})
                </option>
              ))}
            </NativeSelect>
            {baseUnit && (
              <p className="text-xs leading-5 text-muted-foreground">
                Calculs en {measurementKindLabel(baseUnit.kind).toLowerCase()} via {baseUnit.symbol}.
              </p>
            )}
          </Field>
          <Field label="Image" className="md:col-span-2">
            <Input
              value={draft.imageUrl}
              onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}
              placeholder="https://..."
            />
          </Field>
          <Field label="Notes" className="md:col-span-2">
            <Textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </Field>
          <Field label="Quantité en stock">
            <Input
              type="number"
              min={0}
              step="any"
              value={draft.stockQuantity}
              onChange={(event) => setDraft({ ...draft, stockQuantity: event.target.value })}
              placeholder="0"
            />
          </Field>
          <Field label="Unité de stock">
            <NativeSelect
              value={draft.stockUnitId}
              onChange={(event) => setDraft({ ...draft, stockUnitId: event.target.value })}
            >
              {stockUnitOptions.map((entry) => (
                <option key={entry.unitId} value={entry.unitId}>
                  {entry.unit.symbol}
                </option>
              ))}
            </NativeSelect>
            {stockBasePreview !== null && baseUnit && (
              <p className="text-xs leading-5 text-muted-foreground">
                Équivaut à {formatNumber(stockBasePreview)} {baseUnit.symbol} · déduit des estimations d&apos;achat
              </p>
            )}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Ratios spécifiques</h3>
              <p className="text-sm leading-5 text-muted-foreground">
                {automaticUnitCount} unité{automaticUnitCount > 1 ? "s" : ""} disponible
                {automaticUnitCount > 1 ? "s" : ""} automatiquement pour ce type de mesure. Ajoute seulement
                les unités variables comme pièce, filet ou boîte.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  units: [...current.units, { key: key(), unitId: "", toBaseFactor: "" }],
                }))
              }
              className="shrink-0"
            >
              <Plus data-icon="inline-start" />
              Ratio
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {specificRows.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Aucun ratio spécifique. Les unités du type de mesure sont déjà utilisables.
            </div>
          )}
          {specificRows.map((row) => {
            const unit = units.find((item) => item.id === row.unitId);
            const allowsSpecificRatio = canDefineIngredientSpecificRatio(unit, baseUnit, globalRatios, units);
            const effectiveFactor = effectiveToBaseFactor(unit, baseUnit, row.toBaseFactor, globalRatios, {
              allowSpecific: allowsSpecificRatio,
              units,
            });
            return (
              <div key={row.key} className="grid gap-3 rounded-lg border border-border bg-card p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)_44px] md:items-end">
                <Field label="Unité">
                  <NativeSelect
                    value={row.unitId}
                    onChange={(event) => updateUnitChoice(row.key, event.target.value)}
                  >
                    <option value="">Choisir</option>
                    {specificUnitOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} ({option.symbol})
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Ratio ingrédient">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={allowsSpecificRatio ? row.toBaseFactor : ""}
                    disabled={!allowsSpecificRatio}
                    placeholder={allowsSpecificRatio ? "ex. 180" : "Auto"}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        units: current.units.map((item) =>
                          item.key === row.key ? { ...item, toBaseFactor: event.target.value } : item,
                        ),
                      }))
                    }
                  />
                </Field>
                <div className="flex min-w-0 items-end">
                  {unit && baseUnit && effectiveFactor ? (
                    <Badge className="border-primary/20 bg-primary/10 text-primary">
                      1 {unit.symbol} = {formatNumber(effectiveFactor)} {baseUnit.symbol} · ingrédient
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      {unit ? "Ratio spécifique requis" : "Choisir une unité variable"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-end justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        units: current.units.filter((item) => item.key !== row.key),
                      }))
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Produits magasin</h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  products: [
                    ...current.products,
                    {
                      key: key(),
                      store: "",
                      brand: "",
                      name: "",
                      imageUrl: "",
                      packageQuantity: "",
                      packageUnitId: current.baseUnitId,
                      packageToBaseFactor: "",
                      price: "",
                      url: "",
                      barcode: "",
                      notes: "",
                    },
                  ],
                }))
              }
              className="shrink-0"
            >
              <Plus data-icon="inline-start" />
              Produit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {draft.products.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Aucun produit lié.
            </div>
          )}
          {draft.products.map((product) => {
            const unit = units.find((item) => item.id === product.packageUnitId);
            const usesSystemRatio = globalConversionFactor(unit, baseUnit, globalRatios, units) !== null;
            const effectiveFactor = effectiveToBaseFactor(
              unit,
              baseUnit,
              product.packageToBaseFactor,
              globalRatios,
              { allowSpecific: true, units },
            );
            const derivedPrice = pricePerBaseUnit(
              Number(product.price),
              Number(product.packageQuantity),
              effectiveFactor,
            );
            const preferredPriceUnit = standardUnitForPrice(baseUnit, units);
            const preferredPriceFactor = globalConversionFactor(preferredPriceUnit, baseUnit, globalRatios, units);
            const standardPriceUnit = preferredPriceFactor !== null ? preferredPriceUnit : baseUnit;
            const standardPrice = derivedPrice !== null && preferredPriceFactor !== null
              ? derivedPrice * preferredPriceFactor
              : derivedPrice;
            return (
              <div key={product.key} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                  <EntityImage src={product.imageUrl} label={product.name || "Produit"} size="sm" className="shrink-0" />
                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <Field label="Magasin">
                      <NativeSelect
                        className="w-full"
                        value={product.store}
                        onChange={(event) => updateProduct(setDraft, product.key, { store: event.target.value })}
                      >
                        <option value="">Choisir</option>
                        {KNOWN_STORES.map((store) => (
                          <option key={store} value={store}>
                            {store}
                          </option>
                        ))}
                        {product.store && !knownStoreSet.has(product.store) && (
                          <option value={product.store}>{product.store}</option>
                        )}
                      </NativeSelect>
                    </Field>
                    <Field label="Marque">
                      <Input value={product.brand} onChange={(event) => updateProduct(setDraft, product.key, { brand: event.target.value })} />
                    </Field>
                    <Field label="Produit" className="sm:col-span-2 xl:col-span-1">
                      <Input value={product.name} onChange={(event) => updateProduct(setDraft, product.key, { name: event.target.value })} />
                    </Field>
                  </div>
                  <div className="flex justify-end lg:pt-6">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          products: current.products.filter((item) => item.key !== product.key),
                        }))
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Qté">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={product.packageQuantity}
                      onChange={(event) => updateProduct(setDraft, product.key, { packageQuantity: event.target.value })}
                    />
                  </Field>
                  <Field label="Unité">
                    <NativeSelect
                      value={product.packageUnitId}
                      onChange={(event) =>
                        updateProduct(setDraft, product.key, {
                          packageUnitId: event.target.value,
                          packageToBaseFactor: globalConversionFactor(
                            units.find((item) => item.id === event.target.value),
                            baseUnit,
                            globalRatios,
                            units,
                          ) !== null
                            ? ""
                            : product.packageToBaseFactor,
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
                  <Field label="Ratio produit">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={usesSystemRatio ? effectiveFactor?.toString() ?? "" : product.packageToBaseFactor}
                      disabled={usesSystemRatio}
                      onChange={(event) =>
                        updateProduct(setDraft, product.key, { packageToBaseFactor: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Prix">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={product.price}
                      onChange={(event) => updateProduct(setDraft, product.key, { price: event.target.value })}
                    />
                  </Field>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Image">
                    <Input
                      value={product.imageUrl}
                      onChange={(event) => updateProduct(setDraft, product.key, { imageUrl: event.target.value })}
                      placeholder="https://..."
                    />
                  </Field>
                  <Field label="URL">
                    <Input value={product.url} onChange={(event) => updateProduct(setDraft, product.key, { url: event.target.value })} />
                  </Field>
                  <Field label="Code-barres">
                    <Input value={product.barcode} onChange={(event) => updateProduct(setDraft, product.key, { barcode: event.target.value })} />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {standardPrice !== null && standardPriceUnit ? (
                    <Badge className="border-primary/20 bg-primary/10 text-primary">
                      {formatCurrency(standardPrice)} / {standardPriceUnit.symbol} ·{" "}
                      {usesSystemRatio ? "défini dans Unités" : "produit"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Ratio produit requis{unit ? ` pour ${unit.symbol}` : ""}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <StickySave busy={busy} notice={notice} onSave={onSave} onDelete={draft.id ? onDelete : undefined} />
    </section>
  );
}
