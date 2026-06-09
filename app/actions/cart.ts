"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { cartItemPayloadSchema } from "@/lib/validation";
import { actionError } from "@/app/actions/shared";

export async function upsertCartItem(recipeId: string, portions: number) {
  try {
    const data = cartItemPayloadSchema.parse({ recipeId, portions });
    await prisma.cartItem.upsert({
      where: { recipeId: data.recipeId },
      create: { recipeId: data.recipeId, portions: data.portions },
      update: { portions: data.portions },
    });
    revalidatePath("/");
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function removeCartRecipe(recipeId: string) {
  try {
    await prisma.cartItem.deleteMany({ where: { recipeId } });
    revalidatePath("/");
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}
