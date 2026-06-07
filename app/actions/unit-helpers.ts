import { globalConversionFactor } from "@/lib/conversions";

type UnitRef = {
  id: string;
  code: string;
  kind: string;
  globalBaseUnitId?: string | null;
  globalToBaseFactor?: number | null;
};

export function supportsIngredientSpecificRatio(unit?: { kind: string } | null) {
  return unit ? ["COUNT", "PACKAGE", "CUSTOM"].includes(unit.kind) : false;
}

export function isHardcodedMeasurementUnit(unit?: { kind: string } | null) {
  return unit ? unit.kind === "MASS" || unit.kind === "VOLUME" : false;
}

export function canonicalBaseUnitForKind(kind: string, units: UnitRef[]) {
  const preferredCode = {
    MASS: "g",
    VOLUME: "ml",
    COUNT: "piece",
  }[kind as "MASS" | "VOLUME" | "COUNT"];
  return preferredCode
    ? units.find((unit) => unit.code === preferredCode) ?? units.find((unit) => unit.kind === kind)
    : null;
}

function measurementCanonicalUnit(unit: UnitRef | undefined, units: UnitRef[]) {
  if (!unit || !["MASS", "VOLUME"].includes(unit.kind)) return null;
  const canonicalUnit = canonicalBaseUnitForKind(unit.kind, units);
  if (!canonicalUnit) return null;
  const factor = globalConversionFactor(unit, canonicalUnit, [], units);
  return factor === null ? null : { unit: canonicalUnit, factor };
}

export function normalizeConfigurableUnitRatio(
  data: { id?: string | null; fromUnitId: string; toUnitId: string; factor: number },
  units: UnitRef[],
) {
  const fromUnit = units.find((unit) => unit.id === data.fromUnitId);
  const toUnit = units.find((unit) => unit.id === data.toUnitId);
  const fromCanonical = measurementCanonicalUnit(fromUnit, units);
  const toCanonical = measurementCanonicalUnit(toUnit, units);

  if (fromCanonical && toCanonical) return null;
  if (!fromCanonical && !toCanonical) return null;

  if (fromCanonical && !toCanonical) {
    return {
      ...data,
      fromUnitId: fromCanonical.unit.id,
      factor: data.factor / fromCanonical.factor,
    };
  }

  if (!fromCanonical && toCanonical) {
    return {
      ...data,
      toUnitId: toCanonical.unit.id,
      factor: data.factor * toCanonical.factor,
    };
  }

  return null;
}
