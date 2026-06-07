"use client";

import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { importHelloFreshRecipe } from "@/app/actions";
import type { HelloFreshImportResult } from "@/lib/hellofresh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type HelloFreshImporterProps = {
  busy: boolean;
  onImport: (result: HelloFreshImportResult) => void;
  onError: (message: string) => void;
};

export function HelloFreshImporter({ busy, onImport, onError }: HelloFreshImporterProps) {
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleImport() {
    startTransition(async () => {
      const result = await importHelloFreshRecipe(url);
      if (result.ok) {
        onImport(result.import);
      } else {
        onError(result.error);
      }
    });
  }

  const disabled = busy || isPending || !url.trim();

  return (
    <div className="rounded-lg border border-dashed border-[#ffd1dc] bg-[#fff0f3]/70 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="hellofresh-url" className="normal-case tracking-normal text-[#d70466]">
            Importer depuis HelloFresh
          </Label>
          <Input
            id="hellofresh-url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://www.hellofresh.fr/recipes/..."
            className="bg-white"
          />
          <p className="text-xs text-[#717171]">
            Les données sont lues depuis le JSON SSR de la page (`__NEXT_DATA__`).
          </p>
        </div>
        <Button onClick={handleImport} disabled={disabled} className="md:mb-0.5">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Importer
        </Button>
      </div>
    </div>
  );
}

export function importStatusLabel(status: RecipeImportStatus | undefined): string {
  switch (status) {
    case "matched":
      return "Correspondance OK";
    case "ingredient_missing":
      return "Ingrédient introuvable";
    case "unit_missing":
      return "Unité manquante pour cet ingrédient";
    case "unit_unknown":
      return "Unité HelloFresh non reconnue";
    default:
      return "";
  }
}

export type RecipeImportStatus = "matched" | "ingredient_missing" | "unit_missing" | "unit_unknown";

export function importStatusClassName(status: RecipeImportStatus | undefined): string {
  switch (status) {
    case "matched":
      return "border-[#cce8d8] bg-[#f0fff6] text-[#0b6b3a]";
    case "ingredient_missing":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "unit_missing":
      return "border-orange-200 bg-orange-50 text-orange-900";
    case "unit_unknown":
      return "border-[#dddddd] bg-[#f7f4ef] text-[#222222]";
    default:
      return "";
  }
}
