export type ConversionUnit = {
  id: string;
  symbol: string;
  toBaseFactor: number;
};

export type UnitWithGlobalRatio = {
  id: string;
  code?: string | null;
  globalBaseUnitId?: string | null;
  globalToBaseFactor?: number | null;
};

export type GlobalUnitRatio = {
  fromUnitId: string;
  toUnitId: string;
  factor: number;
};

export const IMMUTABLE_UNIT_RATIOS = [
  { fromCode: "kg", toCode: "g", factor: 1000 },
  { fromCode: "l", toCode: "ml", factor: 1000 },
  { fromCode: "cl", toCode: "ml", factor: 10 },
] as const;

export function globalConversionFactor(
  fromUnit?: UnitWithGlobalRatio | string | null,
  toUnit?: UnitWithGlobalRatio | string | null,
  ratios: GlobalUnitRatio[] = [],
  units: UnitWithGlobalRatio[] = [],
) {
  if (!fromUnit || !toUnit) return null;
  const fromUnitId = typeof fromUnit === "string" ? fromUnit : fromUnit.id;
  const toUnitId = typeof toUnit === "string" ? toUnit : toUnit.id;

  if (fromUnitId === toUnitId) return 1;

  const graph = new Map<string, Array<{ unitId: string; factor: number }>>();
  function addEdge(fromUnitId: string, toUnitId: string, factor: number) {
    if (!Number.isFinite(factor) || factor <= 0) return;
    graph.set(fromUnitId, [
      ...(graph.get(fromUnitId) ?? []),
      { unitId: toUnitId, factor },
    ]);
    graph.set(toUnitId, [
      ...(graph.get(toUnitId) ?? []),
      { unitId: fromUnitId, factor: 1 / factor },
    ]);
  }

  const graphUnits = new Map<string, UnitWithGlobalRatio>();
  for (const unit of units) {
    graphUnits.set(unit.id, unit);
  }
  for (const unit of [fromUnit, toUnit]) {
    if (typeof unit === "string" || !unit) continue;
    graphUnits.set(unit.id, unit);
  }
  const unitByCode = new Map<string, UnitWithGlobalRatio>();
  for (const unit of graphUnits.values()) {
    if (!unit.code) continue;
    unitByCode.set(unit.code, unit);
  }
  for (const ratio of IMMUTABLE_UNIT_RATIOS) {
    const fromRatioUnit = unitByCode.get(ratio.fromCode);
    const toRatioUnit = unitByCode.get(ratio.toCode);
    if (!fromRatioUnit || !toRatioUnit) continue;
    addEdge(fromRatioUnit.id, toRatioUnit.id, ratio.factor);
  }
  for (const unit of graphUnits.values()) {
    if (typeof unit === "string" || !unit?.globalBaseUnitId || !unit.globalToBaseFactor) continue;
    addEdge(unit.id, unit.globalBaseUnitId, unit.globalToBaseFactor);
  }
  for (const ratio of ratios) {
    addEdge(ratio.fromUnitId, ratio.toUnitId, ratio.factor);
  }

  const queue: Array<{ unitId: string; factor: number }> = [{ unitId: fromUnitId, factor: 1 }];
  const visited = new Set<string>([fromUnitId]);

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    for (const edge of graph.get(current.unitId) ?? []) {
      if (visited.has(edge.unitId)) continue;
      const nextFactor = current.factor * edge.factor;
      if (edge.unitId === toUnitId) return nextFactor;
      visited.add(edge.unitId);
      queue.push({ unitId: edge.unitId, factor: nextFactor });
    }
  }

  return null;
}

export function effectiveToBaseFactor(
  unit?: UnitWithGlobalRatio | null,
  baseUnit?: UnitWithGlobalRatio | null,
  ingredientSpecificFactor?: number | string | null,
  ratios: GlobalUnitRatio[] = [],
  options: { allowSpecific?: boolean; units?: UnitWithGlobalRatio[] } = {},
) {
  const globalFactor = globalConversionFactor(unit, baseUnit, ratios, options.units);
  if (globalFactor !== null) return globalFactor;

  if (!options.allowSpecific) return null;

  const factor = typeof ingredientSpecificFactor === "string"
    ? Number(ingredientSpecificFactor)
    : ingredientSpecificFactor;
  if (!factor || !Number.isFinite(factor) || factor <= 0) return null;
  return factor;
}

export function convertToBase(quantity: number, toBaseFactor?: number | null) {
  if (!Number.isFinite(quantity) || quantity < 0) return null;
  if (!toBaseFactor || !Number.isFinite(toBaseFactor) || toBaseFactor <= 0) {
    return null;
  }
  return quantity * toBaseFactor;
}

export function pricePerBaseUnit(price: number, quantity: number, toBaseFactor?: number | null) {
  const baseQuantity = convertToBase(quantity, toBaseFactor);
  if (!baseQuantity || !Number.isFinite(price) || price < 0) return null;
  return price / baseQuantity;
}

export function scaleQuantity(quantityPerServing: number, portions: number) {
  if (!Number.isFinite(quantityPerServing) || !Number.isFinite(portions)) return 0;
  return quantityPerServing * Math.max(1, portions);
}
