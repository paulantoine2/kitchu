"use client";

import { useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ProductStorageBadge } from "@/components/kitchu/product-storage-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { effectiveToBaseFactor, globalConversionFactor, pricePerBaseUnit } from "@/lib/conversions";
import { PRODUCT_STORAGE_TYPES, productStorageLabels, isProductStorageType } from "@/lib/product-storage";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { key } from "@/components/kitchu/drafts";
import type { IngredientDraft, UnitRatioRecord, UnitRecord } from "@/components/kitchu/types";
import { EntityImage, Field, StickySave } from "@/components/kitchu/ui/shared";
import {
  baseMeasurementOptions,
  canDefineIngredientSpecificRatio,
  canonicalBaseUnitForKind,
  measurementKindLabel,
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

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const element = document.getElementById(hash);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

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
    <section className="mx-auto flex w-full max-w-3xl animate-fade-in flex-col gap-12 pb-20">
      <div>
        <div className="mb-6 flex min-w-0 items-center gap-4">
          <EntityImage src={draft.imageUrl} label={draft.name || "Ingrédient"} size="md" className="shrink-0" />
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{draft.id ? "Modifier l'ingrédient" : "Nouvel ingrédient"}</h1>
        </div>
        <div className="flex flex-col gap-6">
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
                  units: addBaseUnitRow(baseUnitId, current.units),
                  products: current.products.map((product) => ({
                    ...product,
                    packageUnitId: product.packageUnitId || baseUnitId,
                  })),
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
              <p className="text-sm text-muted-foreground">
                Calculs en {measurementKindLabel(baseUnit.kind).toLowerCase()} via {baseUnit.symbol}.
              </p>
            )}
          </Field>
          <Field label="Image">
            <Input
              value={draft.imageUrl}
              onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })}
              placeholder="https://..."
            />
          </Field>
          <Field label="Notes">
            <Textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
          </Field>
        </div>
      </div>

      <div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Ratios spécifiques</h3>
            <p className="text-sm text-muted-foreground">
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
        <div className="flex flex-col gap-4">
          {specificRows.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
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
              <div key={row.key} className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-end">
                <div className="flex-1">
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
                </div>
                <div className="flex-1">
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
                </div>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                  {unit && baseUnit && effectiveFactor ? (
                    <Badge className="border-primary/20 bg-primary/10 text-primary">
                      1 {unit.symbol} = {formatNumber(effectiveFactor)} {baseUnit.symbol} · ingrédient
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      {unit ? "Ratio spécifique requis" : "Choisir une unité variable"}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        units: current.units.filter((item) => item.key !== row.key),
                      }))
                    }
                    className="self-end sm:self-auto"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Produits magasin</h3>
            <p className="text-sm text-muted-foreground">
              Chaque produit a une conservation (frais, surgelé, sec) et son propre stock à réutiliser en priorité.
            </p>
          </div>
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
                    storageType: "FRESH",
                    stockQuantity: "",
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
        <div className="flex flex-col gap-6">
          {draft.products.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
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
              <div
                key={product.key}
                id={product.id ? `product-${product.id}` : undefined}
                className="flex scroll-mt-24 flex-col gap-6 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <ProductStorageBadge storageType={product.storageType} />
                    {product.stockQuantity && Number(product.stockQuantity) > 0 && unit && (
                      <Badge variant="outline">
                        Stock {formatNumber(Number(product.stockQuantity))} {unit.symbol}
                      </Badge>
                    )}
                  </div>
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
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                  <EntityImage src={product.imageUrl} label={product.name || "Produit"} size="sm" className="shrink-0" />
                  <div className="flex min-w-0 flex-1 flex-col gap-6">
                    <div className="grid gap-4 sm:grid-cols-2">
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
                      <Field label="Produit" className="sm:col-span-2">
                        <Input value={product.name} onChange={(event) => updateProduct(setDraft, product.key, { name: event.target.value })} />
                      </Field>
                      <Field label="Conservation" className="sm:col-span-2">
                        <NativeSelect
                          value={isProductStorageType(product.storageType) ? product.storageType : "FRESH"}
                          onChange={(event) => {
                            const value = event.target.value;
                            updateProduct(setDraft, product.key, {
                              storageType: isProductStorageType(value) ? value : "FRESH",
                            });
                          }}
                        >
                          {PRODUCT_STORAGE_TYPES.map((storageType) => (
                            <option key={storageType} value={storageType}>
                              {productStorageLabels[storageType]}
                            </option>
                          ))}
                        </NativeSelect>
                      </Field>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                  <h4 className="mb-4 text-sm font-semibold">Stock</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Quantité en stock">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={product.stockQuantity}
                        onChange={(event) => updateProduct(setDraft, product.key, { stockQuantity: event.target.value })}
                        placeholder="0"
                        disabled={!product.packageUnitId}
                      />
                    </Field>
                    <Field label="Unité">
                      <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
                        {unit?.symbol ?? "—"}
                      </div>
                    </Field>
                  </div>
                  {!product.packageUnitId && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Choisis d&apos;abord l&apos;unité colis pour renseigner le stock.
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                  <h4 className="mb-4 text-sm font-semibold">Caractéristiques colis</h4>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Qté colis">
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={product.packageQuantity}
                        onChange={(event) => updateProduct(setDraft, product.key, { packageQuantity: event.target.value })}
                      />
                    </Field>
                    <Field label="Unité colis">
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
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
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
                  <Field label="Code-barres" className="sm:col-span-2">
                    <Input value={product.barcode} onChange={(event) => updateProduct(setDraft, product.key, { barcode: event.target.value })} />
                  </Field>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2">
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
        </div>
      </div>

      <StickySave busy={busy} notice={notice} onSave={onSave} onDelete={draft.id ? onDelete : undefined} />
    </section>
  );
}
