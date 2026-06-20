import assert from "node:assert/strict";
import test from "node:test";
import { parseLeclercDriveProductFromJson } from "./parse";

const lieuNoirJson = JSON.stringify({
  sInfosProduit: "Dénomination légale de vente : FILET DE LIEU NOIR\rMarque commerciale : ECO +\r",
  sDescriptionCommerciale: "DOS DE CABILLAUD\r",
  iIdProduit: 202892,
  sLibelleLigne1: "Filet de lieu noir Eco+",
  sLibelleLigne2: "Sans peau et sans arête - 220g",
  sLibelleMarque: "Eco +",
  iIdPhotoEnLigne: 2966713,
  nrPVUnitaireTTC: 3.99,
  sCodeEAN: "3450971457049",
  fSurgele: false,
  sUniteDeMesureUnitaire: "GR",
  nrContenanceUnitaire: 220,
  lstValeursNutritionnelles: [],
});

test("parseLeclercDriveProductFromJson parses pasted objProduit JSON", () => {
  const product = parseLeclercDriveProductFromJson(
    lieuNoirJson,
    "https://fd4-courses.leclercdrive.fr/magasin-090611-090611-La-Colle-sur-Loup/fiche-produits-202892-Filet-de-lieu-noir-Eco.aspx",
  );

  assert.equal(product.productId, 202892);
  assert.equal(product.name, "Filet de lieu noir Eco+");
  assert.equal(product.subtitle, "Sans peau et sans arête - 220g");
  assert.equal(product.brand, "Eco +");
  assert.equal(product.barcode, "3450971457049");
  assert.equal(product.price, 3.99);
  assert.equal(product.packageQuantity, 220);
  assert.equal(product.packageUnitCode, "g");
  assert.match(product.imageUrl ?? "", /2966713/);
});

test("parseLeclercDriveProductFromJson accepts objProduit wrapper", () => {
  const product = parseLeclercDriveProductFromJson(
    JSON.stringify({ objProduit: JSON.parse(lieuNoirJson) }),
    "",
  );

  assert.equal(product.name, "Filet de lieu noir Eco+");
  assert.equal(product.url, "");
});
