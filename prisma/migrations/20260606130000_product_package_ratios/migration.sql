ALTER TABLE "ProductReference" ADD COLUMN "packageToBaseFactor" REAL;

UPDATE "ProductReference"
SET "packageToBaseFactor" = (
  SELECT iu."toBaseFactor"
  FROM "IngredientUnit" iu
  WHERE iu."ingredientId" = "ProductReference"."ingredientId"
    AND iu."unitId" = "ProductReference"."packageUnitId"
    AND iu."toBaseFactor" IS NOT NULL
  LIMIT 1
);
