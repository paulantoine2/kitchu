export type LeclercDriveNutritionRow = {
  sLibelle: string;
  sValeur: string;
  sUnite?: string;
  niNiveauIndentation?: number;
};

export type LeclercDriveProductRaw = {
  iIdProduit: number;
  sLibelleLigne1: string;
  sLibelleLigne2?: string;
  sCodeEAN?: string;
  nrPVUnitaireTTC: number;
  nrContenanceUnitaire?: number;
  sUniteDeMesureUnitaire?: string;
  sInfosProduit?: string;
  sLibelleMarque?: string;
  sComposition?: string;
  sDescriptionCommerciale?: string;
  fSurgele?: boolean;
  iIdPhotoEnLigne?: number;
  lstValeursNutritionnelles?: LeclercDriveNutritionRow[];
};

export type ParsedLeclercDriveProduct = {
  productId: number;
  name: string;
  subtitle: string | null;
  brand: string | null;
  barcode: string | null;
  price: number;
  packageQuantity: number;
  packageUnitCode: string | null;
  imageUrl: string | null;
  storageType: "FRESH" | "FROZEN";
  url: string;
  notes: string | null;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
};
