"use server";

import { prisma } from "@/lib/prisma";
import { recipePayloadSchema } from "@/lib/validation";
import { actionError } from "@/app/actions/shared";
import { revalidateKitchuPaths } from "@/lib/revalidate-kitchu";

export async function saveRecipe(payload: unknown) {
  try {
    const data = recipePayloadSchema.parse(payload);
    const recipe = await prisma.$transaction(async (tx) => {
      const saved = data.id
        ? await tx.recipe.update({
            where: { id: data.id },
            data: {
              name: data.name,
              imageUrl: data.imageUrl,
              description: data.description,
              sourceUrl: data.sourceUrl,
              prepMinutes: data.prepMinutes,
              cookMinutes: data.cookMinutes,
            },
          })
        : await tx.recipe.create({
            data: {
              name: data.name,
              imageUrl: data.imageUrl,
              description: data.description,
              sourceUrl: data.sourceUrl,
              prepMinutes: data.prepMinutes,
              cookMinutes: data.cookMinutes,
            },
          });

      await tx.recipeIngredient.deleteMany({ where: { recipeId: saved.id } });
      await tx.recipeStep.deleteMany({ where: { recipeId: saved.id } });
      await tx.recipeIngredient.createMany({
        data: data.ingredients.map((item, position) => ({
          recipeId: saved.id,
          ingredientId: item.ingredientId,
          unitId: item.unitId,
          quantityPerServing: item.quantityPerServing,
          unitToBaseFactor: item.unitToBaseFactor,
          note: item.note,
          position,
        })),
      });
      await tx.recipeStep.createMany({
        data: data.steps.map((step, position) => ({
          recipeId: saved.id,
          instruction: step.instruction,
          position,
        })),
      });
      return saved;
    });

    revalidateKitchuPaths({ recipeId: recipe.id });
    return { ok: true as const, id: recipe.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteRecipe(id: string) {
  try {
    await prisma.recipe.delete({ where: { id } });
    revalidateKitchuPaths({ recipeId: id });
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}
