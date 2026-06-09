"use server";

import { prisma } from "@/lib/prisma";
import { cartItemPayloadSchema } from "@/lib/validation";
import { actionError } from "@/app/actions/shared";
import { revalidateKitchuPaths } from "@/lib/revalidate-kitchu";

export async function upsertCartItem(recipeId: string, portions: number) {
  try {
    const data = cartItemPayloadSchema.parse({ recipeId, portions });
    await prisma.cartItem.upsert({
      where: { recipeId: data.recipeId },
      create: { recipeId: data.recipeId, portions: data.portions },
      update: { portions: data.portions },
    });
    revalidateKitchuPaths({ recipeId: data.recipeId });
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function removeCartRecipe(recipeId: string) {
  try {
    await prisma.cartItem.deleteMany({ where: { recipeId } });
    revalidateKitchuPaths({ recipeId });
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}
