"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { globalConversionFactor } from "@/lib/conversions";
import {
  isHelloFreshRecipeUrl,
  matchHelloFreshRecipe,
  parseHelloFreshRecipe,
  type HelloFreshImportResult,
  type HelloFreshRecipe,
} from "@/lib/hellofresh";
import { actionError } from "@/app/actions/shared";

export async function importHelloFreshRecipe(url: string) {
  try {
    const sourceUrl = z.string().url().parse(url.trim());
    if (!isHelloFreshRecipeUrl(sourceUrl)) {
      return { ok: false as const, error: "URL HelloFresh invalide." };
    }

    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; KitchuImporter/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      return { ok: false as const, error: `HelloFresh a répondu ${response.status}.` };
    }

    const html = await response.text();
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!nextDataMatch?.[1]) {
      return { ok: false as const, error: "Impossible de lire les données HelloFresh sur cette page." };
    }

    const nextData = JSON.parse(nextDataMatch[1]) as {
      props?: { pageProps?: { ssrPayload?: { recipe?: HelloFreshRecipe } } };
    };
    const recipe = nextData.props?.pageProps?.ssrPayload?.recipe;
    if (!recipe) {
      return { ok: false as const, error: "Recette HelloFresh introuvable dans la page." };
    }

    const parsed = parseHelloFreshRecipe(recipe, sourceUrl, 1);

    const [ingredients, units, globalRatios] = await Promise.all([
      prisma.ingredient.findMany({
        include: {
          baseUnit: true,
          units: { include: { unit: true }, orderBy: { unit: { name: "asc" } } },
        },
        orderBy: { name: "asc" },
      }),
      prisma.unit.findMany({ orderBy: { name: "asc" } }),
      prisma.unitRatio.findMany(),
    ]);

    const result = matchHelloFreshRecipe(
      parsed,
      ingredients.map((item) => {
        const unitOptions = new Map<string, { unitId: string; unit: { id: string; code: string; symbol: string } }>();
        for (const unit of units) {
          if (globalConversionFactor(unit, item.baseUnit, globalRatios, units) === null) continue;
          unitOptions.set(unit.id, {
            unitId: unit.id,
            unit: { id: unit.id, code: unit.code, symbol: unit.symbol },
          });
        }
        for (const entry of item.units) {
          unitOptions.set(entry.unitId, {
            unitId: entry.unitId,
            unit: { id: entry.unit.id, code: entry.unit.code, symbol: entry.unit.symbol },
          });
        }
        return {
          id: item.id,
          name: item.name,
          units: Array.from(unitOptions.values()),
        };
      }),
      units.map((unit) => ({ id: unit.id, code: unit.code, symbol: unit.symbol })),
    ) satisfies HelloFreshImportResult;

    return { ok: true as const, import: result };
  } catch (error) {
    return actionError(error);
  }
}
