import type { IngredientDraft, IngredientRecord, UnitRecord } from "@/components/kitchu/types";

export function move<T>(items: T[], from: number, to: number) {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function updateProduct(
  setDraft: React.Dispatch<React.SetStateAction<IngredientDraft>>,
  productKey: string,
  patch: Partial<IngredientDraft["products"][number]>,
) {
  setDraft((current) => ({
    ...current,
    products: current.products.map((product) =>
      product.key === productKey ? { ...product, ...patch } : product,
    ),
  }));
}

export function uniqueUnits(ingredients: IngredientRecord[]) {
  const byId = new Map<string, UnitRecord>();
  for (const ingredient of ingredients) {
    byId.set(ingredient.baseUnit.id, ingredient.baseUnit);
    for (const item of ingredient.units) {
      byId.set(item.unit.id, item.unit);
    }
    for (const product of ingredient.products) {
      byId.set(product.packageUnit.id, product.packageUnit);
    }
  }
  return Array.from(byId.values());
}

export function standardUnitForPrice(baseUnit: UnitRecord | undefined, units: UnitRecord[]) {
  if (!baseUnit) return undefined;

  if (baseUnit.kind === "MASS") {
    return units.find((unit) => unit.code === "kg") ?? baseUnit;
  }
  if (baseUnit.kind === "VOLUME") {
    return units.find((unit) => unit.code === "l") ?? baseUnit;
  }

  return baseUnit;
}
