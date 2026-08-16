-- Ingredients previously used COUNT units (pièce, filet, etc.) as their base.
-- Move them to gram and reset ingredient-specific ratios that were relative to count.

UPDATE "IngredientUnit" iu
SET "toBaseFactor" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Ingredient" i
JOIN "Unit" u ON u.id = i."baseUnitId"
WHERE iu."ingredientId" = i.id
  AND u.kind = 'COUNT'
  AND iu."toBaseFactor" IS NOT NULL;

UPDATE "ProductReference" pr
SET "packageToBaseFactor" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Ingredient" i
JOIN "Unit" u ON u.id = i."baseUnitId"
WHERE pr."ingredientId" = i.id
  AND u.kind = 'COUNT'
  AND pr."packageToBaseFactor" IS NOT NULL;

INSERT INTO "IngredientUnit" ("id", "ingredientId", "unitId", "toBaseFactor", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  i.id,
  gram.id,
  NULL,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Ingredient" i
JOIN "Unit" u ON u.id = i."baseUnitId"
CROSS JOIN LATERAL (
  SELECT id FROM "Unit" WHERE code = 'g' LIMIT 1
) AS gram
WHERE u.kind = 'COUNT'
  AND NOT EXISTS (
    SELECT 1
    FROM "IngredientUnit" existing
    WHERE existing."ingredientId" = i.id
      AND existing."unitId" = gram.id
  );

UPDATE "Ingredient" i
SET "baseUnitId" = gram.id,
    "updatedAt" = CURRENT_TIMESTAMP
FROM "Unit" u
CROSS JOIN LATERAL (
  SELECT id FROM "Unit" WHERE code = 'g' LIMIT 1
) AS gram
WHERE u.id = i."baseUnitId"
  AND u.kind = 'COUNT';
