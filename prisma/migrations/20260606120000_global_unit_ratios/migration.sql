-- Add a global reference unit so fixed conversions can live on Unit itself.
ALTER TABLE "Unit" ADD COLUMN "globalBaseUnitId" TEXT REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "Unit"
SET "globalBaseUnitId" = NULL,
    "globalToBaseFactor" = NULL
WHERE "code" IN ('g', 'ml', 'piece');

UPDATE "Unit"
SET "globalBaseUnitId" = (SELECT "id" FROM "Unit" WHERE "code" = 'g'),
    "globalToBaseFactor" = 1000
WHERE "code" = 'kg';

UPDATE "Unit"
SET "globalBaseUnitId" = (SELECT "id" FROM "Unit" WHERE "code" = 'ml'),
    "globalToBaseFactor" = 1000
WHERE "code" = 'l';

-- Ingredient-specific ratios are now optional: NULL means the global unit ratio is used.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_IngredientUnit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ingredientId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "toBaseFactor" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IngredientUnit_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IngredientUnit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_IngredientUnit" ("id", "ingredientId", "unitId", "toBaseFactor", "createdAt", "updatedAt")
SELECT "id", "ingredientId", "unitId", "toBaseFactor", "createdAt", "updatedAt"
FROM "IngredientUnit";

DROP TABLE "IngredientUnit";
ALTER TABLE "new_IngredientUnit" RENAME TO "IngredientUnit";
CREATE UNIQUE INDEX "IngredientUnit_ingredientId_unitId_key" ON "IngredientUnit"("ingredientId", "unitId");

PRAGMA foreign_keys=ON;

UPDATE "IngredientUnit"
SET "toBaseFactor" = NULL
WHERE EXISTS (
  SELECT 1
  FROM "Ingredient" i
  JOIN "Unit" u ON u."id" = "IngredientUnit"."unitId"
  WHERE i."id" = "IngredientUnit"."ingredientId"
    AND (
      u."id" = i."baseUnitId"
      OR u."globalBaseUnitId" = i."baseUnitId"
    )
);
