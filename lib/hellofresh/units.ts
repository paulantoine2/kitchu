const HELLOFRESH_UNIT_MAP: Record<string, string> = {
  g: "g",
  kg: "kg",
  ml: "ml",
  l: "l",
  "pièce(s)": "piece",
  "pièce(": "piece",
  piece: "piece",
  "sachet(s)": "sachet",
  "pot(s)": "pot",
  cs: "cas",
  "c. à s.": "cas",
  cc: "cac",
  "c. à c.": "cac",
  filet: "filet",
  "tranche(s)": "tranche",
  boîte: "boite",
  "boite(s)": "boite",
};

const BASE_UNIT_BY_CODE: Record<string, string> = {
  g: "g",
  kg: "g",
  ml: "ml",
  l: "ml",
  piece: "g",
  sachet: "g",
  pot: "g",
  cas: "ml",
  cac: "ml",
  filet: "g",
  tranche: "g",
  boite: "g",
};

export function normalizeHelloFreshUnitLabel(unit: string): string {
  return unit.trim().toLowerCase().replace(/\s+/g, " ");
}

export function helloFreshUnitToCode(unit: string): string | null {
  const normalized = normalizeHelloFreshUnitLabel(unit);
  if (normalized === "selon le goût" || normalized === "selon le gout") {
    return null;
  }
  if (HELLOFRESH_UNIT_MAP[normalized]) {
    return HELLOFRESH_UNIT_MAP[normalized];
  }
  for (const [pattern, code] of Object.entries(HELLOFRESH_UNIT_MAP)) {
    if (normalized.startsWith(pattern.replace("(s)", ""))) {
      return code;
    }
  }
  return null;
}

export function suggestedBaseUnitCode(unitCode: string | null): string {
  if (!unitCode) return "g";
  return BASE_UNIT_BY_CODE[unitCode] ?? "g";
}

export function isTasteUnit(unit: string): boolean {
  const normalized = normalizeHelloFreshUnitLabel(unit);
  return normalized === "selon le goût" || normalized === "selon le gout";
}
