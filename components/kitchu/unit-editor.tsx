"use client";

import { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatNumber } from "@/lib/utils";
import type {
  IngredientRecord,
  MeasurementRatioRecord,
  RecipeRecord,
  UnitDraft,
  UnitRatioRecord,
  UnitRecord,
} from "@/components/kitchu/types";
import { Field, StickySave } from "@/components/kitchu/ui/shared";
import {
  canonicalBaseUnitForKind,
  configurableMeasurementKindsForUnit,
  formatImpactCount,
  isHardcodedMeasurementKind,
  measurementKindLabel,
  measurementRatioForUnit,
  unitDraftAsRecord,
  unitImpactedIngredients,
} from "@/components/kitchu/unit-helpers";

export function UnitListSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="px-1 text-xs font-semibold uppercase tracking-wide text-[#717171]">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function UnitListButton({
  unit,
  active,
  onClick,
}: {
  unit: UnitRecord;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`block w-full min-w-0 rounded-lg border px-3 py-3 text-left transition ${
        active
          ? "border-[#222222] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.08)]"
          : "border-transparent hover:border-[#dddddd] hover:bg-white hover:shadow-[0_4px_18px_rgba(0,0,0,0.05)]"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate font-semibold">{unit.name}</span>
        <div className="flex shrink-0 gap-1">
          <Badge>{unit.symbol}</Badge>
        </div>
      </div>
      <div className="mt-1 text-xs text-[#717171]">
        {unit.code} · {unit.kind.toLowerCase()}
      </div>
    </button>
  );
}
export function UnitEditor({
  draft,
  setDraft,
  units,
  ingredients,
  recipes,
  globalRatios,
  busy,
  notice,
  onSave,
  onDelete,
  onSaveRatio,
  onDeleteRatio,
}: {
  draft: UnitDraft;
  setDraft: React.Dispatch<React.SetStateAction<UnitDraft>>;
  units: UnitRecord[];
  ingredients: IngredientRecord[];
  recipes: RecipeRecord[];
  globalRatios: UnitRatioRecord[];
  busy: boolean;
  notice: string;
  onSave: () => void;
  onDelete: () => void;
  onSaveRatio: (payload: { id?: string; fromUnitId: string; toUnitId: string; factor: string }) => void;
  onDeleteRatio: (id: string) => void;
}) {
  const currentUnit = units.find((unit) => unit.id === draft.id) ?? unitDraftAsRecord(draft);
  const measurementTargets = currentUnit
    ? configurableMeasurementKindsForUnit(currentUnit)
        .map((kind) => {
          const unit = canonicalBaseUnitForKind(kind, units);
          return unit ? { kind, label: measurementKindLabel(kind), unit } : null;
        })
        .filter((target): target is { kind: "MASS" | "VOLUME"; label: string; unit: UnitRecord } =>
          Boolean(target),
        )
    : [];
  const configuredRatioCount = currentUnit
    ? measurementTargets.filter((target) =>
        measurementRatioForUnit(currentUnit, target.unit, globalRatios, units),
      ).length
    : 0;
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const impactedIngredients = draft.id ? unitImpactedIngredients(draft.id, ingredients, recipes) : [];
  const canDeleteCurrentUnit = Boolean(draft.id && currentUnit && !isHardcodedMeasurementKind(currentUnit.kind));

  function requestDelete() {
    if (impactedIngredients.length > 0) {
      setShowDeleteWarning(true);
      return;
    }
    onDelete();
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">{draft.id ? "Modifier l'unité" : "Nouvelle unité"}</h2>
              <p className="text-sm text-[#717171]">Base commune utilisée par les ingrédients.</p>
            </div>
            <Badge>{units.length} unités</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_160px_160px]">
            <Field label="Nom">
              <Input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </Field>
            <Field label="Code">
              <Input
                value={draft.code}
                onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
              />
            </Field>
            <Field label="Symbole">
              <Input
                value={draft.symbol}
                onChange={(event) => setDraft((current) => ({ ...current, symbol: event.target.value }))}
              />
            </Field>
          </div>
          <div className="grid gap-3 md:grid-cols-[220px_1fr]">
            <Field label="Famille">
              <Select
                value={draft.kind}
                onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value }))}
              >
                <option value="MASS">Masse</option>
                <option value="VOLUME">Volume</option>
                <option value="COUNT">Comptage</option>
                <option value="PACKAGE">Conditionnement</option>
                <option value="CUSTOM">Personnalisée</option>
              </Select>
            </Field>
            <div className="flex items-end">
              <div className="flex flex-wrap gap-2">
                <Badge>{configuredRatioCount} configurables</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Ratios vers masse / volume</h3>
              <p className="text-sm text-[#717171]">
                Pour les autres unités, définis simplement leur équivalent en grammes et/ou en millilitres.
              </p>
            </div>
            <Badge>Optionnel</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!currentUnit && (
            <div className="rounded-lg border border-dashed border-[#dddddd] bg-[#fffdfb] p-6 text-center text-sm text-[#717171]">
              Enregistre l&apos;unité avant d&apos;ajouter ses ratios.
            </div>
          )}
          {currentUnit && isHardcodedMeasurementKind(currentUnit.kind) && (
            <div className="rounded-lg border border-dashed border-[#dddddd] bg-[#fffdfb] p-6 text-center text-sm text-[#717171]">
              Les conversions entre g/kg et ml/cl/l sont définies dans le code.
            </div>
          )}
          {currentUnit && !isHardcodedMeasurementKind(currentUnit.kind) && measurementTargets.length === 0 && (
            <div className="rounded-lg border border-dashed border-[#dddddd] bg-[#fffdfb] p-6 text-center text-sm text-[#717171]">
              Les unités de base g et ml doivent exister pour ajouter des conversions globales.
            </div>
          )}
          {currentUnit && !isHardcodedMeasurementKind(currentUnit.kind) && (
            measurementTargets.map((target) => (
              <MeasurementRatioEditorRow
                key={`${currentUnit.id}-${target.kind}-${measurementRatioForUnit(currentUnit, target.unit, globalRatios, units)?.id ?? "new"}`}
                currentUnit={currentUnit}
                targetLabel={target.label}
                targetUnit={target.unit}
                ratio={measurementRatioForUnit(currentUnit, target.unit, globalRatios, units)}
                busy={busy}
                onSave={onSaveRatio}
                onDelete={onDeleteRatio}
              />
            ))
          )}
        </CardContent>
      </Card>

      {showDeleteWarning && currentUnit && (
        <Card className="border-[#ffd1dc] bg-[#fff8fa]">
          <CardHeader>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <Badge className="w-fit border-[#ffd1dc] bg-white text-[#d70466]">Action irréversible</Badge>
                <h3 className="text-lg font-semibold text-[#d70466]">
                  Supprimer l&apos;unité « {currentUnit.name} » ?
                </h3>
                <p className="text-sm leading-6 text-[#717171]">
                  Cette unité est encore liée à {formatImpactCount(impactedIngredients.length)}.
                  Vérifie les changements ci-dessous avant de confirmer.
                </p>
              </div>
              <Badge className="w-fit bg-white">{currentUnit.symbol}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-[#ffd1dc] bg-white p-3 text-sm leading-6 text-[#717171]">
              En confirmant, Kitchu supprimera l&apos;unité et nettoiera automatiquement les références associées
              pour éviter des conversions incohérentes.
            </div>
            <div className="space-y-2">
              {impactedIngredients.map((impact) => (
                <div
                  key={impact.ingredientId}
                  className="rounded-lg border border-[#ffd1dc] bg-white p-3"
                >
                  <div className="font-semibold">{impact.ingredientName}</div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {impact.reasons.map((reason) => (
                      <div
                        key={`${impact.ingredientId}-${reason.title}-${reason.detail}`}
                        className="rounded-md border border-[#eeeeee] bg-[#fffdfb] p-3"
                      >
                        <div className="text-xs font-semibold uppercase tracking-wide text-[#d70466]">
                          {reason.title}
                        </div>
                        <div className="mt-1 text-sm leading-5 text-[#717171]">{reason.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" onClick={() => setShowDeleteWarning(false)} disabled={busy}>
                Garder l&apos;unité
              </Button>
              <Button variant="destructive" onClick={onDelete} disabled={busy}>
                <Trash2 className="h-4 w-4" />
                Supprimer définitivement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!showDeleteWarning && (
        <StickySave busy={busy} notice={notice} onSave={onSave} onDelete={canDeleteCurrentUnit ? requestDelete : undefined} />
      )}
    </section>
  );
}

function MeasurementRatioEditorRow({
  ratio,
  currentUnit,
  targetLabel,
  targetUnit,
  busy,
  onSave,
  onDelete,
}: {
  ratio: MeasurementRatioRecord | null;
  currentUnit: UnitRecord;
  targetLabel: string;
  targetUnit: UnitRecord;
  busy: boolean;
  onSave: (payload: { id?: string; fromUnitId: string; toUnitId: string; factor: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [factor, setFactor] = useState(ratio?.factorToTarget.toString() ?? "");
  const numericFactor = Number(factor);

  return (
    <div className="grid gap-3 rounded-lg border border-[#eeeeee] bg-white p-3 shadow-sm md:grid-cols-[1fr_160px_1fr_142px]">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-[#717171]">Destination</div>
        <div className="mt-1 font-semibold">{targetLabel}</div>
        <div className="text-sm text-[#717171]">{targetUnit.symbol}</div>
      </div>
      <Field label="Ratio">
        <Input
          type="number"
          min={0}
          step="0.0001"
          value={factor}
          onChange={(event) => setFactor(event.target.value)}
          placeholder={`ex. ${targetUnit.code === "ml" ? "5" : "100"}`}
        />
      </Field>
      <div className="flex items-end">
        <div className="flex flex-wrap gap-2">
          <Badge>
            {factor && Number.isFinite(numericFactor) && numericFactor > 0
              ? `1 ${currentUnit.symbol} = ${formatNumber(numericFactor, 4)} ${targetUnit.symbol}`
              : `1 ${currentUnit.symbol} = ... ${targetUnit.symbol}`}
          </Badge>
          {ratio?.storedTargetUnit.id !== targetUnit.id && ratio?.storedTargetUnit && (
            <Badge>Stocké {ratio.storedTargetUnit.symbol}</Badge>
          )}
        </div>
      </div>
      <div className="flex items-end gap-1">
        {ratio && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Supprimer le ratio ${targetLabel.toLowerCase()}`}
            onClick={() => onDelete(ratio.id)}
            disabled={busy}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="sm"
          aria-label={`Enregistrer le ratio ${targetLabel.toLowerCase()}`}
          onClick={() =>
            onSave({
              id: ratio?.id,
              fromUnitId: currentUnit.id,
              toUnitId: targetUnit.id,
              factor,
            })
          }
          disabled={busy || !factor || !Number.isFinite(numericFactor) || numericFactor <= 0}
        >
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
