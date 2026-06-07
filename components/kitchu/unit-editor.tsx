"use client";

import { useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { formatNumber } from "@/lib/utils";
import type {
  IngredientRecord,
  MeasurementRatioRecord,
  RecipeRecord,
  UnitDraft,
  UnitRatioRecord,
  UnitRecord,
} from "@/components/kitchu/types";
import { Field, LibraryListItem, StickySave } from "@/components/kitchu/ui/shared";
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
    <div className="flex flex-col gap-2">
      <div className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="flex flex-col gap-2">{children}</div>
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
    <LibraryListItem
      active={active}
      onClick={onClick}
      media={
        <div className="flex size-8 items-center justify-center rounded-sm bg-secondary text-xs font-semibold">
          {unit.symbol}
        </div>
      }
      title={unit.name}
      description={`${unit.code} · ${unit.kind.toLowerCase()}`}
    />
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
    <section className="flex min-w-0 flex-col gap-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold">{draft.id ? "Modifier l'unité" : "Nouvelle unité"}</h2>
              <p className="text-sm text-muted-foreground">Base commune utilisée par les ingrédients.</p>
            </div>
            <Badge className="w-fit shrink-0">{units.length} unités</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-3 md:grid-cols-3">
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
          <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:items-end">
            <Field label="Famille">
              <NativeSelect
                value={draft.kind}
                onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value }))}
              >
                <option value="MASS">Masse</option>
                <option value="VOLUME">Volume</option>
                <option value="COUNT">Comptage</option>
                <option value="PACKAGE">Conditionnement</option>
                <option value="CUSTOM">Personnalisée</option>
              </NativeSelect>
            </Field>
            <div className="flex flex-wrap items-center gap-2 pb-0.5">
              <Badge variant="outline">{configuredRatioCount} configurables</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold">Ratios vers masse / volume</h3>
              <p className="text-sm text-muted-foreground">
                Pour les autres unités, définis simplement leur équivalent en grammes et/ou en millilitres.
              </p>
            </div>
            <Badge>Optionnel</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!currentUnit && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Enregistre l&apos;unité avant d&apos;ajouter ses ratios.
            </div>
          )}
          {currentUnit && isHardcodedMeasurementKind(currentUnit.kind) && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Les conversions entre g/kg et ml/cl/l sont définies dans le code.
            </div>
          )}
          {currentUnit && !isHardcodedMeasurementKind(currentUnit.kind) && measurementTargets.length === 0 && (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
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
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <Badge className="w-fit border-primary/20 bg-card text-primary">Action irréversible</Badge>
                <h3 className="text-lg font-semibold text-primary">
                  Supprimer l&apos;unité « {currentUnit.name} » ?
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Cette unité est encore liée à {formatImpactCount(impactedIngredients.length)}.
                  Vérifie les changements ci-dessous avant de confirmer.
                </p>
              </div>
              <Badge className="w-fit shrink-0 bg-card">{currentUnit.symbol}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-lg border border-primary/20 bg-card p-3 text-sm leading-6 text-muted-foreground">
              En confirmant, Kitchu supprimera l&apos;unité et nettoiera automatiquement les références associées
              pour éviter des conversions incohérentes.
            </div>
            <div className="flex flex-col gap-2">
              {impactedIngredients.map((impact) => (
                <div
                  key={impact.ingredientId}
                  className="rounded-lg border border-primary/20 bg-card p-3"
                >
                  <div className="font-semibold">{impact.ingredientName}</div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2">
                    {impact.reasons.map((reason) => (
                      <div
                        key={`${impact.ingredientId}-${reason.title}-${reason.detail}`}
                        className="rounded-md border border-border bg-muted/30 p-3"
                      >
                        <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                          {reason.title}
                        </div>
                        <div className="mt-1 text-sm leading-5 text-muted-foreground">{reason.detail}</div>
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
                <Trash2 data-icon="inline-start" />
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
    <div className="grid gap-3 rounded-lg border border-border bg-card p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)_auto] md:items-end">
      <div className="min-w-0">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Destination</div>
        <div className="mt-1 font-semibold">{targetLabel}</div>
        <div className="text-sm text-muted-foreground">{targetUnit.symbol}</div>
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
      <div className="flex min-w-0 items-end">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {factor && Number.isFinite(numericFactor) && numericFactor > 0
              ? `1 ${currentUnit.symbol} = ${formatNumber(numericFactor, 4)} ${targetUnit.symbol}`
              : `1 ${currentUnit.symbol} = ... ${targetUnit.symbol}`}
          </Badge>
          {ratio?.storedTargetUnit.id !== targetUnit.id && ratio?.storedTargetUnit && (
            <Badge variant="secondary">Stocké {ratio.storedTargetUnit.symbol}</Badge>
          )}
        </div>
      </div>
      <div className="flex items-end justify-end gap-1">
        {ratio && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Supprimer le ratio ${targetLabel.toLowerCase()}`}
            onClick={() => onDelete(ratio.id)}
            disabled={busy}
          >
            <Trash2 />
          </Button>
        )}
        <Button
          size="sm"
          className="shrink-0"
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
          <Save data-icon="inline-start" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
