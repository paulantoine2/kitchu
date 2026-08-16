"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { key } from "@/components/kitchu/drafts";
import type { IngredientDraft, UnitRecord } from "@/components/kitchu/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseLeclercDriveProductFromJson } from "@/lib/leclerc-drive";
import { mapLeclercDriveProductToDraft } from "@/lib/leclerc-drive/map";

type LeclercDriveImporterProps = {
  busy: boolean;
  units: UnitRecord[];
  baseUnitId: string;
  setDraft: React.Dispatch<React.SetStateAction<IngredientDraft>>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

export function LeclercDriveImporter({
  busy,
  units,
  baseUnitId,
  setDraft,
  onError,
  onSuccess,
}: LeclercDriveImporterProps) {
  const [url, setUrl] = useState("");
  const [json, setJson] = useState("");

  function handleImport() {
    const trimmedJson = json.trim();
    if (!trimmedJson) {
      onError("Collez le JSON objProduit copié depuis Leclerc Drive.");
      return;
    }

    try {
      const parsed = parseLeclercDriveProductFromJson(trimmedJson, url.trim());
      const fields = mapLeclercDriveProductToDraft(parsed, units, baseUnitId);

      setDraft((current) => ({
        ...current,
        products: [
          ...current.products,
          {
            key: key(),
            store: fields.store,
            brand: fields.brand,
            name: fields.name,
            imageUrl: fields.imageUrl,
            storageType: fields.storageType,
            stockQuantity: "",
            packageQuantity: fields.packageQuantity,
            packageUnitId: fields.packageUnitId || current.baseUnitId,
            packageToBaseFactor: fields.packageToBaseFactor,
            price: fields.price,
            url: fields.url,
            barcode: fields.barcode,
            notes: fields.notes,
            caloriesPer100g: fields.caloriesPer100g,
            proteinPer100g: fields.proteinPer100g,
            carbsPer100g: fields.carbsPer100g,
            fatPer100g: fields.fatPer100g,
          },
        ],
      }));

      onSuccess(`Produit importé : ${parsed.name}`);
      setJson("");
    } catch (error) {
      onError(error instanceof Error ? error.message : "Impossible de lire le JSON fourni.");
    }
  }

  const disabled = busy || !json.trim();

  return (
    <div className="rounded-lg border border-dashed border-primary/20 bg-primary/10 p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leclerc-drive-url" className="normal-case tracking-normal text-primary">
            Importer depuis Leclerc Drive
          </Label>
          <Input
            id="leclerc-drive-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="URL fiche produit (optionnel)"
            className="bg-card"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="leclerc-drive-json" className="normal-case tracking-normal">
            JSON objProduit
          </Label>
          <Textarea
            id="leclerc-drive-json"
            value={json}
            onChange={(event) => setJson(event.target.value)}
            placeholder='Collez l&apos;objet JSON copié depuis la console (objProduit ou contenu direct).'
            className="min-h-32 bg-card font-mono text-xs"
            spellCheck={false}
          />
          <p className="text-xs text-muted-foreground">
            Sur la fiche produit : DevTools → Console → copiez l&apos;objet{" "}
            <code className="text-foreground">objProduit</code> affiché par Leclerc Drive.
          </p>
        </div>

        <Button onClick={handleImport} disabled={disabled} className="self-start">
          <Download data-icon="inline-start" />
          Importer
        </Button>
      </div>
    </div>
  );
}
