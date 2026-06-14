import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../lib/prisma";

type SeedSnapshot = {
  exportedAt: string;
  source: string;
  units: Array<Record<string, unknown>>;
  unitRatios: Array<Record<string, unknown>>;
  ingredients: Array<Record<string, unknown>>;
  ingredientUnits: Array<Record<string, unknown>>;
  productReferences: Array<Record<string, unknown>>;
  recipes: Array<Record<string, unknown>>;
  recipeIngredients: Array<Record<string, unknown>>;
  recipeSteps: Array<Record<string, unknown>>;
  cartItems: Array<Record<string, unknown>>;
};

function loadSnapshot(): SeedSnapshot {
  const path = join(process.cwd(), "prisma/seed-data.json");
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as SeedSnapshot;
}

async function clearDatabase() {
  await prisma.cartItem.deleteMany();
  await prisma.recipeIngredient.deleteMany();
  await prisma.recipeStep.deleteMany();
  await prisma.recipe.deleteMany();
  await prisma.productReference.deleteMany();
  await prisma.ingredientUnit.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.unitRatio.deleteMany();
  await prisma.unit.deleteMany();
}

const DATE_FIELDS = new Set(["createdAt", "updatedAt"]);

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...row };

  for (const field of DATE_FIELDS) {
    const value = normalized[field];
    if (typeof value === "string") {
      normalized[field] = new Date(value.endsWith("Z") ? value : `${value}Z`);
    }
  }

  return normalized;
}

function normalizeRows(rows: Array<Record<string, unknown>>) {
  return rows.map((row) => normalizeRow(row));
}

async function seedFromSnapshot(snapshot: SeedSnapshot) {
  if (snapshot.units.length > 0) {
    await prisma.unit.createMany({ data: normalizeRows(snapshot.units) });
  }
  if (snapshot.unitRatios.length > 0) {
    await prisma.unitRatio.createMany({ data: normalizeRows(snapshot.unitRatios) });
  }
  if (snapshot.ingredients.length > 0) {
    await prisma.ingredient.createMany({ data: normalizeRows(snapshot.ingredients) });
  }
  if (snapshot.ingredientUnits.length > 0) {
    await prisma.ingredientUnit.createMany({
      data: normalizeRows(snapshot.ingredientUnits),
    });
  }
  if (snapshot.productReferences.length > 0) {
    await prisma.productReference.createMany({
      data: normalizeRows(snapshot.productReferences),
    });
  }
  if (snapshot.recipes.length > 0) {
    await prisma.recipe.createMany({ data: normalizeRows(snapshot.recipes) });
  }
  if (snapshot.recipeIngredients.length > 0) {
    await prisma.recipeIngredient.createMany({
      data: normalizeRows(snapshot.recipeIngredients),
    });
  }
  if (snapshot.recipeSteps.length > 0) {
    await prisma.recipeStep.createMany({ data: normalizeRows(snapshot.recipeSteps) });
  }
  if (snapshot.cartItems.length > 0) {
    await prisma.cartItem.createMany({ data: normalizeRows(snapshot.cartItems) });
  }
}

async function main() {
  const snapshot = loadSnapshot();
  await clearDatabase();
  await seedFromSnapshot(snapshot);

  console.log(
    `Seeded local database from ${snapshot.source} snapshot (${snapshot.exportedAt}).`,
  );
  console.log(
    `${snapshot.units.length} units, ${snapshot.ingredients.length} ingredients, ${snapshot.recipes.length} recipes, ${snapshot.cartItems.length} cart items.`,
  );
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
