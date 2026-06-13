-- AlterTable
ALTER TABLE "Ingredient" ADD COLUMN "preparationWeightRatio" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "RecipeIngredient" ADD COLUMN "preparationWeightRatio" DOUBLE PRECISION;
