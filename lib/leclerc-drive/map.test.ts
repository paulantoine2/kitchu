import assert from "node:assert/strict";
import test from "node:test";
import { mapLeclercDriveProductToDraft } from "./map";
import type { ParsedLeclercDriveProduct } from "./types";

const units = [
  { id: "u-g", code: "g", name: "Gramme", symbol: "g", kind: "MASS", globalBaseUnitId: null, globalToBaseFactor: null },
  { id: "u-kg", code: "kg", name: "Kilogramme", symbol: "kg", kind: "MASS", globalBaseUnitId: "u-g", globalToBaseFactor: 1000 },
  { id: "u-piece", code: "piece", name: "Pièce", symbol: "pce", kind: "COUNT", globalBaseUnitId: null, globalToBaseFactor: null },
];

const parsed = {
  productId: 110628,
  name: "Burrata Galbani",
  subtitle: "150g",
  brand: "GALBANI",
  barcode: "8000430138931",
  price: 3.49,
  packageQuantity: 150,
  packageUnitCode: "g",
  imageUrl: "https://fd4-photos.leclercdrive.fr/image.ashx?id=3037496&use=l&cat=p&typeid=i",
  storageType: "FRESH",
  url: "https://fd4-courses.leclercdrive.fr/magasin-090611-090611-La-Colle-sur-Loup/fiche-produits-110628-Burrata-Galbani.aspx",
  notes: "Description",
  caloriesPer100g: 256,
  proteinPer100g: 8,
  carbsPer100g: 2,
  fatPer100g: 24,
} satisfies ParsedLeclercDriveProduct;

test("mapLeclercDriveProductToDraft maps store product fields", () => {
  const draft = mapLeclercDriveProductToDraft(parsed, units, "u-g");

  assert.equal(draft.store, "Leclerc");
  assert.equal(draft.brand, "GALBANI");
  assert.equal(draft.name, "Burrata Galbani");
  assert.equal(draft.packageQuantity, "150");
  assert.equal(draft.packageUnitId, "u-g");
  assert.equal(draft.price, "3.49");
  assert.equal(draft.barcode, "8000430138931");
  assert.equal(draft.caloriesPer100g, "256");
});
