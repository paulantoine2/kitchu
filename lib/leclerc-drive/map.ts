import type { ProductStorageType } from "@/lib/product-storage";
import type { UnitRecord } from "@/components/kitchu/types";
import type { ParsedLeclercDriveProduct } from "./types";

export type LeclercDriveProductDraftFields = {
  store: string;
  brand: string;
  name: string;
  imageUrl: string;
  storageType: ProductStorageType;
  packageQuantity: string;
  packageUnitId: string;
  packageToBaseFactor: string;
  price: string;
  url: string;
  barcode: string;
  notes: string;
  caloriesPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
};

export function mapLeclercDriveProductToDraft(
  product: ParsedLeclercDriveProduct,
  units: UnitRecord[],
  baseUnitId: string,
): LeclercDriveProductDraftFields {
  const packageUnitId = resolvePackageUnitId(units, product.packageUnitCode, baseUnitId);

  return {
    store: "Leclerc",
    brand: product.brand ?? "",
    name: product.name,
    imageUrl: product.imageUrl ?? "",
    storageType: product.storageType,
    packageQuantity: String(product.packageQuantity),
    packageUnitId,
    packageToBaseFactor: "",
    price: String(product.price),
    url: product.url,
    barcode: product.barcode ?? "",
    notes: product.notes ?? "",
    caloriesPer100g: formatMacro(product.caloriesPer100g),
    proteinPer100g: formatMacro(product.proteinPer100g),
    carbsPer100g: formatMacro(product.carbsPer100g),
    fatPer100g: formatMacro(product.fatPer100g),
  };
}

function resolvePackageUnitId(units: UnitRecord[], unitCode: string | null, baseUnitId: string): string {
  if (unitCode) {
    const match = units.find((unit) => unit.code === unitCode);
    if (match) return match.id;
  }
  return baseUnitId;
}

function formatMacro(value: number | null): string {
  return value === null ? "" : String(value);
}
