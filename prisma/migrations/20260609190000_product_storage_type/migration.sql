-- CreateEnum
CREATE TYPE "ProductStorageType" AS ENUM ('FRESH', 'FROZEN', 'DRY');

-- AlterTable
ALTER TABLE "ProductReference" ADD COLUMN "storageType" "ProductStorageType" NOT NULL DEFAULT 'FRESH';
ALTER TABLE "ProductReference" ADD COLUMN "stockQuantity" DOUBLE PRECISION;

-- Migrate ingredient stock to the most recently updated product per ingredient
UPDATE "ProductReference" AS pr
SET "stockQuantity" = se."quantity"
FROM "StockEntry" AS se
WHERE se."ingredientId" = pr."ingredientId"
  AND pr."id" = (
    SELECT p."id"
    FROM "ProductReference" AS p
    WHERE p."ingredientId" = se."ingredientId"
    ORDER BY p."updatedAt" DESC
    LIMIT 1
  );

-- DropTable
DROP TABLE "StockEntry";
