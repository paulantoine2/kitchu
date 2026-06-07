"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { recipePayloadSchema } from "@/lib/validation";
import { actionError } from "@/app/actions/shared";

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

    revalidatePath("/");
    return { ok: true as const, id: recipe.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteRecipe(id: string) {
  try {
    await prisma.recipe.delete({ where: { id } });
    revalidatePath("/");
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}
