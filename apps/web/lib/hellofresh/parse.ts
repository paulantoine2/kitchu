import {
  type HelloFreshRecipe,
  type ParsedHelloFreshIngredient,
  type ParsedHelloFreshRecipe,
} from "./types";
import { helloFreshUnitToCode } from "./units";

const HELLOFRESH_IMAGE_BASE = "https://img.hellofresh.com/hellofresh_s3";
const HELLOFRESH_URL_PATTERN =
  /^https?:\/\/(?:www\.)?hellofresh\.[a-z.]+\/recipes\/[a-z0-9-]+-[a-f0-9]{24}(?:\/|$|\?)/i;

export function isHelloFreshRecipeUrl(url: string): boolean {
  try {
    return HELLOFRESH_URL_PATTERN.test(new URL(url.trim()).href);
  } catch {
    return false;
  }
}

export function extractHelloFreshRecipeFromHtml(html: string, sourceUrl: string): ParsedHelloFreshRecipe {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match?.[1]) {
    throw new Error("Impossible de lire les données HelloFresh sur cette page.");
  }

  const nextData = JSON.parse(match[1]) as {
    props?: { pageProps?: { ssrPayload?: { recipe?: HelloFreshRecipe } } };
  };
  const recipe = nextData.props?.pageProps?.ssrPayload?.recipe;
  if (!recipe) {
    throw new Error("Recette HelloFresh introuvable dans la page.");
  }

  return parseHelloFreshRecipe(recipe, sourceUrl, 1);
}

export function parseHelloFreshRecipe(
  recipe: HelloFreshRecipe,
  sourceUrl: string,
  servings: number,
): ParsedHelloFreshRecipe {
  const ingredientById = new Map(recipe.ingredients.map((item) => [item.id, item]));
  const yieldEntry =
    recipe.yields.find((entry) => entry.yields === servings) ??
    recipe.yields.find((entry) => entry.yields === 2) ??
    recipe.yields[0];

  if (!yieldEntry) {
    throw new Error("Quantités par portion indisponibles pour cette recette.");
  }

  const ingredients = yieldEntry.ingredients
    .map((entry) => {
      const meta = ingredientById.get(entry.id);
      if (!meta) return null;

      const unitCode = helloFreshUnitToCode(entry.unit);

      return {
        hfId: entry.id,
        name: meta.name,
        imageUrl: meta.imagePath ? `${HELLOFRESH_IMAGE_BASE}${meta.imagePath}` : "",
        amount: entry.amount,
        unitLabel: entry.unit,
        unitCode,
        shipped: meta.shipped,
      } satisfies ParsedHelloFreshIngredient;
    })
    .filter((item): item is ParsedHelloFreshIngredient => item !== null);

  const prepMinutes = parseIsoDurationMinutes(recipe.prepTime ?? recipe.totalTime);
  const cookMinutes = parseIsoDurationMinutes(recipe.totalTime);
  const description = recipe.headline?.trim() ?? "";
  const imageUrl = recipe.imagePath ? `${HELLOFRESH_IMAGE_BASE}${recipe.imagePath}` : "";

  return {
    name: recipe.name.trim(),
    description,
    imageUrl,
    sourceUrl,
    prepMinutes,
    cookMinutes: cookMinutes !== prepMinutes ? cookMinutes : null,
    servings: yieldEntry.yields,
    ingredients,
    steps: recipe.steps
      .slice()
      .sort((a, b) => a.index - b.index)
      .map((step) => htmlInstructionsToText(step.instructions))
      .filter(Boolean),
  };
}

export function parseIsoDurationMinutes(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 60 + minutes + Math.round(seconds / 60);
}

export function htmlInstructionsToText(html: string): string {
  const withLines = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");

  return withLines
    .split("\n")
    .map((line) => line.trim().replace(/^•\s*/, ""))
    .filter(Boolean)
    .join("\n");
}
