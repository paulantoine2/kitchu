import type { HelloFreshImportResult } from "@/lib/hellofresh";
import type {
  IngredientDraft,
  IngredientRecord,
  RecipeDraft,
  RecipeDraftIngredient,
  RecipeRecord,
  UnitDraft,
  UnitRecord,
} from "@/components/kitchu/types";

export const key = () => Math.random().toString(36).slice(2);

export function helloFreshImportToDraft(result: HelloFreshImportResult): RecipeDraft {
  const { recipe, matches } = result;
  return {
    name: recipe.name,
    imageUrl: recipe.imageUrl,
    description: recipe.description,
    sourceUrl: recipe.sourceUrl,
    prepMinutes: recipe.prepMinutes?.toString() ?? "",
    cookMinutes: recipe.cookMinutes?.toString() ?? "",
    ingredients: matches.map((match) => ({
      key: key(),
      ingredientId: match.ingredientId,
      ingredientName: match.ingredientName,
      ingredientImageUrl: match.imageUrl,
      unitId: match.unitId,
      quantityPerServing: match.amount > 0 ? String(match.amount) : "",
      note: "",
      importStatus: match.status,
      suggestedUnitCode: match.suggestedUnitCode ?? undefined,
      hfUnitLabel: match.unitLabel,
    })),
    steps: recipe.steps.map((instruction) => ({ key: key(), instruction })),
  };
}

export function blankRecipe(): RecipeDraft {
  return {
    name: "",
    imageUrl: "",
    description: "",
    sourceUrl: "",
    prepMinutes: "",
    cookMinutes: "",
    ingredients: [blankRecipeIngredient()],
    steps: [{ key: key(), instruction: "" }],
  };
}

export function blankRecipeIngredient(): RecipeDraftIngredient {
  return {
    key: key(),
    ingredientId: "",
    ingredientName: "",
    ingredientImageUrl: "",
    unitId: "",
    quantityPerServing: "",
    note: "",
  };
}

export function recipeToDraft(recipe?: RecipeRecord | null): RecipeDraft {
  if (!recipe) return blankRecipe();
  return {
    id: recipe.id,
    name: recipe.name,
    imageUrl: recipe.imageUrl ?? "",
    description: recipe.description ?? "",
    sourceUrl: recipe.sourceUrl ?? "",
    prepMinutes: recipe.prepMinutes?.toString() ?? "",
    cookMinutes: recipe.cookMinutes?.toString() ?? "",
    ingredients: recipe.ingredients
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((item) => ({
        key: item.id,
        ingredientId: item.ingredientId,
        ingredientName: item.ingredient.name,
        ingredientImageUrl: item.ingredient.imageUrl ?? "",
        unitId: item.unitId,
        quantityPerServing: item.quantityPerServing.toString(),
        note: item.note ?? "",
      })),
    steps: recipe.steps
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((step) => ({ key: step.id, instruction: step.instruction })),
  };
}

export function blankIngredient(baseUnitId = ""): IngredientDraft {
  return {
    name: "",
    imageUrl: "",
    notes: "",
    baseUnitId,
    stockQuantity: "",
    stockUnitId: baseUnitId,
    units: baseUnitId ? [{ key: key(), unitId: baseUnitId, toBaseFactor: "1" }] : [],
    products: [],
  };
}

export function ingredientToDraft(ingredient: IngredientRecord | undefined, defaultBaseUnitId: string): IngredientDraft {
  if (!ingredient) return blankIngredient(defaultBaseUnitId);
  return {
    id: ingredient.id,
    name: ingredient.name,
    imageUrl: ingredient.imageUrl ?? "",
    notes: ingredient.notes ?? "",
    baseUnitId: ingredient.baseUnitId,
    stockQuantity: ingredient.stock?.quantity.toString() ?? "",
    stockUnitId: ingredient.baseUnitId,
    units: ingredient.units.map((unit) => ({
      key: unit.id,
      unitId: unit.unitId,
      toBaseFactor: unit.toBaseFactor?.toString() ?? "",
    })),
    products: ingredient.products.map((product) => ({
      key: product.id,
      id: product.id,
      store: product.store,
      brand: product.brand ?? "",
      name: product.name,
      imageUrl: product.imageUrl ?? "",
      packageQuantity: product.packageQuantity.toString(),
      packageUnitId: product.packageUnitId,
      packageToBaseFactor: product.packageToBaseFactor?.toString() ?? "",
      price: product.price.toString(),
      url: product.url ?? "",
      barcode: product.barcode ?? "",
      notes: product.notes ?? "",
    })),
  };
}

export function blankUnit(): UnitDraft {
  return {
    code: "",
    name: "",
    symbol: "",
    kind: "CUSTOM",
  };
}

export function unitToDraft(unit?: UnitRecord | null): UnitDraft {
  if (!unit) return blankUnit();
  return {
    id: unit.id,
    code: unit.code,
    name: unit.name,
    symbol: unit.symbol,
    kind: unit.kind,
  };
}
