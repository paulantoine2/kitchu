export type HelloFreshIngredient = {
  id: string;
  name: string;
  slug: string;
  shipped: boolean;
  imagePath?: string;
};

export type HelloFreshYieldIngredient = {
  id: string;
  amount: number;
  unit: string;
};

export type HelloFreshYield = {
  yields: number;
  ingredients: HelloFreshYieldIngredient[];
};

export type HelloFreshStep = {
  index: number;
  instructions: string;
  title?: string;
};

export type HelloFreshRecipe = {
  id: string;
  name: string;
  headline?: string;
  slug: string;
  imagePath?: string;
  prepTime?: string;
  totalTime?: string;
  ingredients: HelloFreshIngredient[];
  yields: HelloFreshYield[];
  steps: HelloFreshStep[];
};

export type ParsedHelloFreshRecipe = {
  name: string;
  description: string;
  imageUrl: string;
  sourceUrl: string;
  prepMinutes: number | null;
  cookMinutes: number | null;
  servings: number;
  ingredients: ParsedHelloFreshIngredient[];
  steps: string[];
};

export type ParsedHelloFreshIngredient = {
  hfId: string;
  name: string;
  imageUrl: string;
  amount: number;
  unitLabel: string;
  unitCode: string | null;
  shipped: boolean;
  note: string;
};

export type IngredientMatchStatus = "matched" | "ingredient_missing" | "unit_missing" | "unit_unknown";

export type MatchedHelloFreshIngredient = ParsedHelloFreshIngredient & {
  status: IngredientMatchStatus;
  ingredientId: string;
  ingredientName: string;
  unitId: string;
  suggestedUnitCode: string | null;
  suggestedUnitSymbol: string | null;
};

export type HelloFreshImportResult = {
  recipe: ParsedHelloFreshRecipe;
  matches: MatchedHelloFreshIngredient[];
};
