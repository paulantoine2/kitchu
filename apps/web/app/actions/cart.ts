"use server";

import { prisma } from "@/lib/prisma";
import { cartItemPayloadSchema } from "@/lib/validation";
import { actionError } from "@/app/actions/shared";
import { revalidateKitchuPaths } from "@/lib/revalidate-kitchu";
import { requireUser } from "@/lib/auth-user";

export async function upsertCartItem(recipeId: string, portions: number) {
  try {
    const user = await requireUser();
    const data = cartItemPayloadSchema.parse({ recipeId, portions });
    await prisma.cartItem.upsert({
      where: { userId_recipeId: { userId: user.id, recipeId: data.recipeId } },
      create: { userId: user.id, recipeId: data.recipeId, portions: data.portions },
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
    const user = await requireUser();
    await prisma.cartItem.deleteMany({ where: { userId: user.id, recipeId } });
    revalidateKitchuPaths({ recipeId });
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}
