import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { extractLeclercDriveProductFromHtml, isLeclercDriveProductUrl } from "./parse";

const sampleUrl =
  "https://fd4-courses.leclercdrive.fr/magasin-090611-090611-La-Colle-sur-Loup/fiche-produits-110628-Burrata-Galbani.aspx";

test("isLeclercDriveProductUrl accepts drive product pages", () => {
  assert.equal(isLeclercDriveProductUrl(sampleUrl), true);
  assert.equal(isLeclercDriveProductUrl("https://www.hellofresh.fr/recipes/test"), false);
});

test("extractLeclercDriveProductFromHtml parses embedded objProduit", () => {
  const html = readFileSync("/tmp/leclerc-burrata.html", "utf8");
  const product = extractLeclercDriveProductFromHtml(html, sampleUrl);

  assert.equal(product.productId, 110628);
  assert.equal(product.name, "Burrata Galbani");
  assert.equal(product.subtitle, "150g");
  assert.equal(product.brand, "GALBANI");
  assert.equal(product.barcode, "8000430138931");
  assert.equal(product.price, 3.49);
  assert.equal(product.packageQuantity, 150);
  assert.equal(product.packageUnitCode, "g");
  assert.equal(product.storageType, "FRESH");
  assert.equal(product.caloriesPer100g, 256);
  assert.equal(product.proteinPer100g, 8);
  assert.equal(product.carbsPer100g, 2);
  assert.equal(product.fatPer100g, 24);
  assert.match(product.imageUrl ?? "", /3037496/);
});
