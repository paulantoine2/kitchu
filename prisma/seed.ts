import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Prisma } from "../app/generated/prisma/client";
import { prisma } from "../lib/prisma";

type SeedSnapshot = {
  exportedAt: string;
  source: string;
  units: Prisma.UnitCreateManyInput[];
  unitRatios: Prisma.UnitRatioCreateManyInput[];
  ingredients: Prisma.IngredientCreateManyInput[];
  ingredientUnits: Prisma.IngredientUnitCreateManyInput[];
  productReferences: Prisma.ProductReferenceCreateManyInput[];
  recipes: Prisma.RecipeCreateManyInput[];
  recipeIngredients: Prisma.RecipeIngredientCreateManyInput[];
  recipeSteps: Prisma.RecipeStepCreateManyInput[];
  cartItems: Prisma.CartItemCreateManyInput[];
};

function loadSnapshot(): SeedSnapshot {
  const path = join(process.cwd(), "prisma/seed-data.json");
  const raw = readFileSync(path, "utf8");
  const snapshot: SeedSnapshot = JSON.parse(raw);
  return snapshot;
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

async function seedFromSnapshot(snapshot: SeedSnapshot) {
  if (snapshot.units.length > 0) {
    await prisma.unit.createMany({ data: snapshot.units });
  }
  if (snapshot.unitRatios.length > 0) {
    await prisma.unitRatio.createMany({ data: snapshot.unitRatios });
  }
  if (snapshot.ingredients.length > 0) {
    await prisma.ingredient.createMany({ data: snapshot.ingredients });
  }
  if (snapshot.ingredientUnits.length > 0) {
    await prisma.ingredientUnit.createMany({ data: snapshot.ingredientUnits });
  }
  if (snapshot.productReferences.length > 0) {
    await prisma.productReference.createMany({ data: snapshot.productReferences });
  }
  if (snapshot.recipes.length > 0) {
    await prisma.recipe.createMany({ data: snapshot.recipes });
  }
  if (snapshot.recipeIngredients.length > 0) {
    await prisma.recipeIngredient.createMany({ data: snapshot.recipeIngredients });
  }
  if (snapshot.recipeSteps.length > 0) {
    await prisma.recipeStep.createMany({ data: snapshot.recipeSteps });
  }
  if (snapshot.cartItems.length > 0) {
    await prisma.cartItem.createMany({ data: snapshot.cartItems });
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
