import { KitchuApp } from "@/components/kitchu-app";
import { prisma } from "@/lib/prisma";

const ingredientInclude = {
  baseUnit: true,
  stock: true,
  units: { include: { unit: true }, orderBy: { unit: { name: "asc" } } },
  products: { include: { packageUnit: true }, orderBy: { updatedAt: "desc" } },
} as const;

function serializeIngredient<T extends { stock: { quantity: number } | null }>(ingredient: T) {
  return {
    ...ingredient,
    stock: ingredient.stock ? { quantity: ingredient.stock.quantity } : null,
  };
}

export default async function Home() {
  const [units, globalRatios, ingredients, recipes] = await Promise.all([
    prisma.unit.findMany({ orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    prisma.unitRatio.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.ingredient.findMany({
      orderBy: { name: "asc" },
      include: ingredientInclude,
    }),
    prisma.recipe.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        ingredients: {
          include: {
            unit: true,
            ingredient: { include: ingredientInclude },
          },
          orderBy: { position: "asc" },
        },
        steps: { orderBy: { position: "asc" } },
      },
    }),
  ]);

  return (
    <KitchuApp
      units={JSON.parse(JSON.stringify(units))}
      globalRatios={JSON.parse(JSON.stringify(globalRatios))}
      ingredients={JSON.parse(JSON.stringify(ingredients.map(serializeIngredient)))}
      recipes={JSON.parse(JSON.stringify(recipes))}
    />
  );
}
