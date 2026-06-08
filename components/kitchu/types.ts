import type { RecipeImportStatus } from "@/components/hellofresh-importer";

export type UnitRecord = {
  id: string;
  code: string;
  name: string;
  symbol: string;
  kind: string;
  globalBaseUnitId: string | null;
  globalToBaseFactor: number | null;
};

export type UnitRatioRecord = {
  id: string;
  fromUnitId: string;
  toUnitId: string;
  factor: number;
};

export type MeasurementRatioRecord = UnitRatioRecord & {
  factorToTarget: number;
  storedTargetUnit: UnitRecord;
};

export type IngredientRecord = {
  id: string;
  name: string;
  imageUrl: string | null;
  notes: string | null;
  baseUnitId: string;
  baseUnit: UnitRecord;
  units: Array<{
    id: string;
    unitId: string;
    toBaseFactor: number | null;
    unit: UnitRecord;
  }>;
  products: Array<{
    id: string;
    store: string;
    brand: string | null;
    name: string;
    imageUrl: string | null;
    packageQuantity: number;
    packageUnitId: string;
    packageToBaseFactor: number | null;
    price: number;
    url: string | null;
    barcode: string | null;
    notes: string | null;
    packageUnit: UnitRecord;
  }>;
  stock: { quantity: number } | null;
};

export type IngredientUnitOption = {
  id: string;
  unitId: string;
  toBaseFactor: number | null;
  unit: UnitRecord;
  source: "automatic" | "specific";
};

export type RecipeRecord = {
  id: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
  sourceUrl: string | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  ingredients: Array<{
    id: string;
    ingredientId: string;
    unitId: string;
    quantityPerServing: number;
    note: string | null;
    position: number;
    ingredient: IngredientRecord;
    unit: UnitRecord;
  }>;
  steps: Array<{
    id: string;
    position: number;
    instruction: string;
  }>;
};

export type RecipeDraft = {
  id?: string;
  name: string;
  imageUrl: string;
  description: string;
  sourceUrl: string;
  prepMinutes: string;
  cookMinutes: string;
  ingredients: RecipeDraftIngredient[];
  steps: Array<{ key: string; instruction: string }>;
};

export type RecipeDraftIngredient = {
  key: string;
  ingredientId: string;
  ingredientName: string;
  ingredientImageUrl: string;
  unitId: string;
  quantityPerServing: string;
  note: string;
  importStatus?: RecipeImportStatus;
  suggestedUnitCode?: string;
  hfUnitLabel?: string;
};

export type IngredientDraft = {
  id?: string;
  name: string;
  imageUrl: string;
  notes: string;
  baseUnitId: string;
  stockQuantity: string;
  stockUnitId: string;
  units: Array<{ key: string; unitId: string; toBaseFactor: string }>;
  products: Array<{
    key: string;
    id?: string;
    store: string;
    brand: string;
    name: string;
    imageUrl: string;
    packageQuantity: string;
    packageUnitId: string;
    packageToBaseFactor: string;
    price: string;
    url: string;
    barcode: string;
    notes: string;
  }>;
};

export type UnitDraft = {
  id?: string;
  code: string;
  name: string;
  symbol: string;
  kind: string;
};

export type KitchuAppProps = {
  units: UnitRecord[];
  globalRatios: UnitRatioRecord[];
  ingredients: IngredientRecord[];
  recipes: RecipeRecord[];
};
