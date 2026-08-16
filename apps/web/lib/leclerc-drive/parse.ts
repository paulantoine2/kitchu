import type { LeclercDriveNutritionRow, LeclercDriveProductRaw, ParsedLeclercDriveProduct } from "./types";

const LECLERC_DRIVE_URL_PATTERN =
  /^https?:\/\/(?:fd\d+-courses|courses)\.leclercdrive\.fr\/magasin-\d+-\d+-[^/]+\/fiche-produits-\d+-[^/?#]+\.aspx(?:[?#].*)?$/i;

const WIDGET_MARKER = "Utilitaires.widget.initOptions('ctl00_main_ctl00_pnlFicheProduit',";
const PHOTO_BASE = "https://fd4-photos.leclercdrive.fr/image.ashx";

export function isLeclercDriveProductUrl(url: string): boolean {
  try {
    return LECLERC_DRIVE_URL_PATTERN.test(new URL(url.trim()).href);
  } catch {
    return false;
  }
}

export function extractLeclercDriveProductFromHtml(html: string, sourceUrl: string): ParsedLeclercDriveProduct {
  const raw = readProductRawFromHtml(html);
  return parseLeclercDriveProduct(raw, sourceUrl);
}

export function parseLeclercDriveProductFromJson(json: string, sourceUrl = ""): ParsedLeclercDriveProduct {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json.trim());
  } catch {
    throw new Error("JSON invalide.");
  }

  const raw = readProductRawFromJson(parsed);
  return parseLeclercDriveProduct(raw, sourceUrl);
}

function readProductRawFromJson(value: unknown): LeclercDriveProductRaw {
  if (typeof value !== "object" || value === null) {
    throw new Error("JSON Leclerc Drive invalide.");
  }

  const record = value as { objProduit?: LeclercDriveProductRaw };
  const product = record.objProduit ?? (value as LeclercDriveProductRaw);
  if (!product.iIdProduit || !product.sLibelleLigne1) {
    throw new Error("JSON Leclerc Drive incomplet (iIdProduit et sLibelleLigne1 requis).");
  }

  return product;
}

function readProductRawFromHtml(html: string): LeclercDriveProductRaw {
  const markerIndex = html.indexOf(WIDGET_MARKER);
  if (markerIndex === -1) {
    throw new Error("Données produit Leclerc Drive introuvables dans cette page.");
  }

  const payloadStart = markerIndex + WIDGET_MARKER.length;
  const payload = extractBalancedObject(html, payloadStart);
  if (!payload) {
    throw new Error("Impossible de lire le bloc produit Leclerc Drive.");
  }

  const parsed = JSON.parse(payload) as { objProduit?: LeclercDriveProductRaw };
  const product = parsed.objProduit;
  if (!product?.iIdProduit || !product.sLibelleLigne1) {
    throw new Error("Produit Leclerc Drive incomplet dans la page.");
  }

  return product;
}

function extractBalancedObject(source: string, startIndex: number): string | null {
  const openIndex = source.indexOf("{", startIndex);
  if (openIndex === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openIndex, index + 1);
      }
    }
  }

  return null;
}

export function parseLeclercDriveProduct(raw: LeclercDriveProductRaw, sourceUrl: string): ParsedLeclercDriveProduct {
  const subtitle = raw.sLibelleLigne2?.trim() || null;
  const brand = extractBrand(raw);
  const nutrition = parseNutrition(raw.lstValeursNutritionnelles ?? []);
  const packageQuantity = raw.nrContenanceUnitaire ?? parseQuantityFromSubtitle(subtitle);
  const packageUnitCode = mapPackageUnit(raw.sUniteDeMesureUnitaire, subtitle);

  return {
    productId: raw.iIdProduit,
    name: raw.sLibelleLigne1.trim(),
    subtitle,
    brand,
    barcode: raw.sCodeEAN?.trim() || null,
    price: raw.nrPVUnitaireTTC,
    packageQuantity,
    packageUnitCode,
    imageUrl: buildImageUrl(raw.iIdPhotoEnLigne),
    storageType: raw.fSurgele ? "FROZEN" : "FRESH",
    url: sourceUrl.trim(),
    notes: buildNotes(raw),
    caloriesPer100g: nutrition.caloriesPer100g,
    proteinPer100g: nutrition.proteinPer100g,
    carbsPer100g: nutrition.carbsPer100g,
    fatPer100g: nutrition.fatPer100g,
  };
}

function extractBrand(raw: LeclercDriveProductRaw): string | null {
  if (raw.sLibelleMarque?.trim()) {
    return raw.sLibelleMarque.trim();
  }
  if (!raw.sInfosProduit) return null;
  const match = raw.sInfosProduit.match(/Marque commerciale\s*:\s*(.+?)(?:\r|\n|$)/i);
  return match?.[1]?.trim() || null;
}

function parseQuantityFromSubtitle(subtitle: string | null): number {
  if (!subtitle) return 1;
  const match = subtitle.match(/(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|cl|u|pièce|pièces)/i);
  if (!match?.[1]) return 1;
  return Number.parseFloat(match[1].replace(",", "."));
}

function mapPackageUnit(unitCode?: string, subtitle?: string | null): string | null {
  if (unitCode === "GR") return "g";
  if (unitCode === "KG") return "kg";
  if (unitCode === "ML") return "ml";
  if (unitCode === "LT") return "l";
  if (unitCode === "CL") return "cl";
  if (unitCode === "U") return "piece";

  if (!subtitle) return null;
  const match = subtitle.match(/\d+(?:[.,]\d+)?\s*(g|kg|ml|l|cl|u|pièce|pièces)/i);
  return match?.[1]?.toLowerCase().replace("pièces", "piece").replace("pièce", "piece") ?? null;
}

function buildImageUrl(photoId?: number): string | null {
  if (!photoId) return null;
  return `${PHOTO_BASE}?id=${photoId}&use=l&cat=p&typeid=i`;
}

function buildNotes(raw: LeclercDriveProductRaw): string | null {
  const parts = [raw.sDescriptionCommerciale, raw.sComposition].map((part) => part?.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

function parseNutrition(rows: LeclercDriveNutritionRow[]) {
  const per100g = rows.filter((row) => row.niNiveauIndentation === 0 || row.niNiveauIndentation === undefined);

  return {
    caloriesPer100g: readNutritionValue(per100g, ["Energie"], "kcal"),
    proteinPer100g: readNutritionValue(per100g, ["Protéines", "Proteines"], "g"),
    carbsPer100g: readNutritionValue(per100g, ["Glucides"], "g"),
    fatPer100g: readNutritionValue(per100g, ["Matières grasses", "Matieres grasses"], "g"),
  };
}

function readNutritionValue(rows: LeclercDriveNutritionRow[], labels: string[], unit: string): number | null {
  const row = rows.find((entry) => labels.includes(entry.sLibelle) && entry.sUnite === unit);
  if (!row?.sValeur) return null;
  const value = Number.parseFloat(row.sValeur.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}
