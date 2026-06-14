import { existsSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import pg from "pg";

const ENV_FILE = ".env.production.local";

if (existsSync(ENV_FILE)) {
  config({ path: ENV_FILE, override: true });
}

const connectionString =
  process.env.PROD_DATABASE_URL ??
  process.env.PRISMA_DATABASE_URL ??
  process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    `Missing production DATABASE_URL. Run "pnpm env:pull" to create ${ENV_FILE}.`,
  );
  process.exit(1);
}

const TABLES = [
  { key: "units", query: 'SELECT row_to_json(t) AS row FROM "Unit" t ORDER BY code' },
  { key: "unitRatios", query: 'SELECT row_to_json(t) AS row FROM "UnitRatio" t' },
  {
    key: "ingredients",
    query: 'SELECT row_to_json(t) AS row FROM "Ingredient" t ORDER BY name',
  },
  { key: "ingredientUnits", query: 'SELECT row_to_json(t) AS row FROM "IngredientUnit" t' },
  {
    key: "productReferences",
    query: 'SELECT row_to_json(t) AS row FROM "ProductReference" t ORDER BY name',
  },
  { key: "recipes", query: 'SELECT row_to_json(t) AS row FROM "Recipe" t ORDER BY name' },
  {
    key: "recipeIngredients",
    query:
      'SELECT row_to_json(t) AS row FROM "RecipeIngredient" t ORDER BY "recipeId", position',
  },
  {
    key: "recipeSteps",
    query: 'SELECT row_to_json(t) AS row FROM "RecipeStep" t ORDER BY "recipeId", position',
  },
  { key: "cartItems", query: 'SELECT row_to_json(t) AS row FROM "CartItem" t' },
];

const client = new pg.Client({ connectionString });

try {
  await client.connect();

  const snapshot = {
    exportedAt: new Date().toISOString(),
    source: "production",
  };

  for (const table of TABLES) {
    const result = await client.query(table.query);
    snapshot[table.key] = result.rows.map((entry) => entry.row);
    console.log(`${table.key}: ${snapshot[table.key].length} rows`);
  }

  writeFileSync(
    "prisma/seed-data.json",
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8",
  );

  console.log("Wrote prisma/seed-data.json");
} finally {
  await client.end();
}
