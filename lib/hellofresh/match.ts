import { suggestedBaseUnitCode } from "./units";
import {
  type HelloFreshImportResult,
  type IngredientMatchStatus,
  type MatchedHelloFreshIngredient,
  type ParsedHelloFreshRecipe,
} from "./types";

export type MatchableUnit = {
  id: string;
  code: string;
  symbol: string;
};

export type MatchableIngredient = {
  id: string;
  name: string;
  units: Array<{ unitId: string; unit: MatchableUnit }>;
};

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase();
}

function findIngredient(ingredients: MatchableIngredient[], name: string): MatchableIngredient | undefined {
  const normalized = normalizeName(name);
  return ingredients.find((item) => normalizeName(item.name) === normalized);
}

function findUnitByCode(units: MatchableUnit[], code: string): MatchableUnit | undefined {
  return units.find((unit) => unit.code === code);
}

export function matchHelloFreshRecipe(
  parsed: ParsedHelloFreshRecipe,
  ingredients: MatchableIngredient[],
  units: MatchableUnit[],
): HelloFreshImportResult {
  const matches = parsed.ingredients.map((item) =>
    matchHelloFreshIngredient(item, ingredients, units),
  );

  return { recipe: parsed, matches };
}

function matchHelloFreshIngredient(
  item: ParsedHelloFreshRecipe["ingredients"][number],
  ingredients: MatchableIngredient[],
  units: MatchableUnit[],
): MatchedHelloFreshIngredient {
  const ingredient = findIngredient(ingredients, item.name);
  const suggestedUnitCode = item.unitCode ?? suggestedBaseUnitCode(item.unitCode);
  const suggestedUnit = suggestedUnitCode ? findUnitByCode(units, suggestedUnitCode) : undefined;

  if (!ingredient) {
    return {
      ...item,
      status: item.unitCode ? "ingredient_missing" : "unit_unknown",
      ingredientId: "",
      ingredientName: item.name,
      unitId: "",
      suggestedUnitCode: item.unitCode ?? suggestedUnitCode,
      suggestedUnitSymbol: suggestedUnit?.symbol ?? item.unitLabel,
    };
  }

  if (!item.unitCode) {
    return {
      ...item,
      status: "unit_unknown",
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      unitId: ingredient.units[0]?.unitId ?? "",
      suggestedUnitCode: null,
      suggestedUnitSymbol: item.unitLabel,
    };
  }

  const allowedUnit = ingredient.units.find((entry) => entry.unit.code === item.unitCode);
  if (!allowedUnit) {
    const status: IngredientMatchStatus = findUnitByCode(units, item.unitCode)
      ? "unit_missing"
      : "unit_unknown";

    return {
      ...item,
      status,
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      unitId: "",
      suggestedUnitCode: item.unitCode,
      suggestedUnitSymbol: suggestedUnit?.symbol ?? item.unitLabel,
    };
  }

  return {
    ...item,
    status: "matched",
    ingredientId: ingredient.id,
    ingredientName: ingredient.name,
    unitId: allowedUnit.unitId,
    suggestedUnitCode: item.unitCode,
    suggestedUnitSymbol: allowedUnit.unit.symbol,
  };
}
