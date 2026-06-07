"use client";

import { Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { effectiveToBaseFactor, globalConversionFactor, pricePerBaseUnit } from "@/lib/conversions";
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
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <EntityImage src={draft.imageUrl} label={draft.name || "Ingrédient"} size="md" />
            <h2 className="text-xl font-semibold">{draft.id ? "Modifier l'ingrédient" : "Nouvel ingrédient"}</h2>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_220px]">
          <Field label="Nom">
            <Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </Field>
          <Field label="Type de mesure">
            <Select
              value={baseUnit?.kind ?? ""}
              onChange={(event) => {
                const canonicalUnit = canonicalBaseUnitForKind(event.target.value, units);
                if (!canonicalUnit) return;
                const baseUnitId = canonicalUnit.id;
                setDraft((current) => ({
                  ...current,
                  baseUnitId,
                  units: addBaseUnitRow(baseUnitId, current.units),
                }));
              }}
            >
              {measurementOptions.map(({ kind, unit }) => (
                <option key={kind} value={kind}>
                  {measurementKindLabel(kind)} ({unit.symbol})
                </option>
              ))}
            </Select>
            {baseUnit && (
              <p className="text-xs leading-5 text-[#717171]">
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Ratios spécifiques</h3>
              <p className="text-sm leading-5 text-[#717171]">
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
            >
              <Plus className="h-4 w-4" />
              Ratio
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {specificRows.length === 0 && (
            <div className="rounded-lg border border-dashed border-[#dddddd] bg-[#fffdfb] p-6 text-center text-sm text-[#717171]">
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
              <div key={row.key} className="grid gap-3 rounded-lg border border-[#eeeeee] bg-white p-3 shadow-sm md:grid-cols-[1fr_160px_1fr_44px]">
                <Field label="Unité">
                  <Select
                    value={row.unitId}
                    onChange={(event) => updateUnitChoice(row.key, event.target.value)}
                  >
                    <option value="">Choisir</option>
                    {specificUnitOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} ({option.symbol})
                      </option>
                    ))}
                  </Select>
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
                <div className="flex items-end text-sm text-[#717171]">
                  {unit && baseUnit && effectiveFactor ? (
                    <Badge className="border-[#ffd1dc] bg-[#fff0f3] text-[#d70466]">
                      1 {unit.symbol} = {formatNumber(effectiveFactor)} {baseUnit.symbol} · ingrédient
                    </Badge>
                  ) : (
                    <Badge>
                      {unit ? "Ratio spécifique requis" : "Choisir une unité variable"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-end">
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
                    <Trash2 className="h-4 w-4" />
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
            >
              <Plus className="h-4 w-4" />
              Produit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {draft.products.length === 0 && (
            <div className="rounded-lg border border-dashed border-[#dddddd] bg-[#fffdfb] p-6 text-center text-sm text-[#717171]">
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
              <div key={product.key} className="rounded-lg border border-[#eeeeee] bg-white p-3 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[56px_1fr_1fr_1.2fr_110px_140px_150px_110px_44px]">
                  <div className="flex items-end">
                    <EntityImage src={product.imageUrl} label={product.name || "Produit"} size="sm" />
                  </div>
                  <Field label="Magasin">
                    <Input value={product.store} onChange={(event) => updateProduct(setDraft, product.key, { store: event.target.value })} />
                  </Field>
                  <Field label="Marque">
                    <Input value={product.brand} onChange={(event) => updateProduct(setDraft, product.key, { brand: event.target.value })} />
                  </Field>
                  <Field label="Produit">
                    <Input value={product.name} onChange={(event) => updateProduct(setDraft, product.key, { name: event.target.value })} />
                  </Field>
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
                    <Select
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
                    </Select>
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
                  <div className="flex items-end">
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
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
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
                  <div className="flex items-end">
                    {standardPrice !== null && standardPriceUnit ? (
                      <Badge className="border-[#ffd1dc] bg-[#fff0f3] text-[#d70466]">
                        {formatCurrency(standardPrice)} / {standardPriceUnit.symbol} ·{" "}
                        {usesSystemRatio ? "défini dans Unités" : "produit"}
                      </Badge>
                    ) : (
                      <Badge>Ratio produit requis{unit ? ` pour ${unit.symbol}` : ""}</Badge>
                    )}
                  </div>
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
