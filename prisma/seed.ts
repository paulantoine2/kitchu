import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const units = [
    { code: "g", name: "gramme", symbol: "g", kind: "MASS", globalToBaseFactor: null },
    { code: "kg", name: "kilogramme", symbol: "kg", kind: "MASS", globalToBaseFactor: null },
    { code: "ml", name: "millilitre", symbol: "ml", kind: "VOLUME", globalToBaseFactor: null },
    { code: "cl", name: "centilitre", symbol: "cl", kind: "VOLUME", globalToBaseFactor: null },
    { code: "l", name: "litre", symbol: "l", kind: "VOLUME", globalToBaseFactor: null },
    { code: "piece", name: "pièce", symbol: "pièce", kind: "COUNT", globalToBaseFactor: null },
    { code: "filet", name: "filet", symbol: "filet", kind: "COUNT", globalToBaseFactor: null },
    { code: "boite", name: "boîte", symbol: "boîte", kind: "PACKAGE", globalToBaseFactor: null },
    { code: "cas", name: "cuillère à soupe", symbol: "c. à s.", kind: "CUSTOM", globalToBaseFactor: null },
    { code: "cac", name: "cuillère à café", symbol: "c. à c.", kind: "CUSTOM", globalToBaseFactor: null },
    { code: "sachet", name: "sachet", symbol: "sachet", kind: "PACKAGE", globalToBaseFactor: null },
    { code: "pot", name: "pot", symbol: "pot", kind: "PACKAGE", globalToBaseFactor: null },
    { code: "tranche", name: "tranche", symbol: "tranche", kind: "COUNT", globalToBaseFactor: null },
  ] as const;

  for (const unit of units) {
    await prisma.unit.upsert({
      where: { code: unit.code },
      update: unit,
      create: unit,
    });
  }

  const gram = await prisma.unit.findUniqueOrThrow({ where: { code: "g" } });
  const kg = await prisma.unit.findUniqueOrThrow({ where: { code: "kg" } });
  const millilitre = await prisma.unit.findUniqueOrThrow({ where: { code: "ml" } });
  const centilitre = await prisma.unit.findUniqueOrThrow({ where: { code: "cl" } });
  const litre = await prisma.unit.findUniqueOrThrow({ where: { code: "l" } });
  const piece = await prisma.unit.findUniqueOrThrow({ where: { code: "piece" } });
  const filet = await prisma.unit.findUniqueOrThrow({ where: { code: "filet" } });
  const boite = await prisma.unit.findUniqueOrThrow({ where: { code: "boite" } });
  const cas = await prisma.unit.findUniqueOrThrow({ where: { code: "cas" } });
  const cac = await prisma.unit.findUniqueOrThrow({ where: { code: "cac" } });

  await prisma.unit.updateMany({
    where: { code: { in: ["g", "kg", "ml", "cl", "l", "piece", "filet", "boite", "cas", "cac", "sachet", "pot", "tranche"] } },
    data: { globalBaseUnitId: null, globalToBaseFactor: null },
  });
  await prisma.unitRatio.deleteMany({
    where: {
      OR: [
        { fromUnitId: kg.id, toUnitId: gram.id },
        { fromUnitId: gram.id, toUnitId: kg.id },
        { fromUnitId: litre.id, toUnitId: millilitre.id },
        { fromUnitId: millilitre.id, toUnitId: litre.id },
        { fromUnitId: centilitre.id, toUnitId: millilitre.id },
        { fromUnitId: millilitre.id, toUnitId: centilitre.id },
        { fromUnitId: litre.id, toUnitId: centilitre.id },
        { fromUnitId: centilitre.id, toUnitId: litre.id },
      ],
    },
  });
  await prisma.unitRatio.upsert({
    where: { fromUnitId_toUnitId: { fromUnitId: cas.id, toUnitId: millilitre.id } },
    update: { factor: 15 },
    create: { fromUnitId: cas.id, toUnitId: millilitre.id, factor: 15 },
  });
  await prisma.unitRatio.upsert({
    where: { fromUnitId_toUnitId: { fromUnitId: cac.id, toUnitId: millilitre.id } },
    update: { factor: 5 },
    create: { fromUnitId: cac.id, toUnitId: millilitre.id, factor: 5 },
  });

  const poisChiches = await prisma.ingredient.upsert({
    where: { name: "Pois chiches" },
    update: { baseUnitId: gram.id, notes: "Poids égoutté recommandé pour les recettes." },
    create: { name: "Pois chiches", baseUnitId: gram.id, notes: "Poids égoutté recommandé pour les recettes." },
  });
  const poulet = await prisma.ingredient.upsert({
    where: { name: "Filet de poulet" },
    update: { baseUnitId: gram.id },
    create: { name: "Filet de poulet", baseUnitId: gram.id },
  });
  const poireau = await prisma.ingredient.upsert({
    where: { name: "Poireau" },
    update: { baseUnitId: gram.id },
    create: { name: "Poireau", baseUnitId: gram.id },
  });

  const allowedUnits = [
    { ingredientId: poisChiches.id, unitId: gram.id, toBaseFactor: null },
    { ingredientId: poisChiches.id, unitId: boite.id, toBaseFactor: 265 },
    { ingredientId: poulet.id, unitId: gram.id, toBaseFactor: null },
    { ingredientId: poulet.id, unitId: filet.id, toBaseFactor: 150 },
    { ingredientId: poireau.id, unitId: gram.id, toBaseFactor: null },
    { ingredientId: poireau.id, unitId: piece.id, toBaseFactor: 180 },
  ];

  await prisma.ingredientUnit.deleteMany({
    where: { ingredientId: { in: [poisChiches.id, poulet.id, poireau.id] } },
  });
  for (const item of allowedUnits) {
    await prisma.ingredientUnit.create({ data: item });
  }

  await prisma.productReference.deleteMany();
  await prisma.productReference.createMany({
    data: [
      {
        ingredientId: poisChiches.id,
        store: "Carrefour",
        brand: "Carrefour Bio",
        name: "Pois chiches conserve",
        packageQuantity: 1,
        packageUnitId: boite.id,
        packageToBaseFactor: 265,
        price: 1.29,
      },
      {
        ingredientId: poulet.id,
        store: "Leclerc",
        brand: "Volaille française",
        name: "Filets de poulet",
        packageQuantity: 1,
        packageUnitId: kg.id,
        packageToBaseFactor: null,
        price: 11.9,
      },
    ],
  });

  const existing = await prisma.recipe.findFirst({ where: { name: "Bol pois chiches poulet" } });
  if (!existing) {
    await prisma.recipe.create({
      data: {
        name: "Bol pois chiches poulet",
        description: "Une base simple pour valider les conversions par ingrédient.",
        prepMinutes: 10,
        cookMinutes: 15,
        ingredients: {
          create: [
            { ingredientId: poisChiches.id, unitId: gram.id, quantityPerServing: 120, position: 0 },
            { ingredientId: poulet.id, unitId: filet.id, quantityPerServing: 1, position: 1 },
            { ingredientId: poireau.id, unitId: piece.id, quantityPerServing: 0.5, position: 2 },
          ],
        },
        steps: {
          create: [
            { position: 0, instruction: "Émincer le poireau et le faire revenir doucement." },
            { position: 1, instruction: "Ajouter le poulet, puis les pois chiches égouttés." },
            { position: 2, instruction: "Assaisonner et servir chaud." },
          ],
        },
      },
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
