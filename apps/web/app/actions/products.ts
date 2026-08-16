"use server";

import { prisma } from "@/lib/prisma";
import { effectiveToBaseFactor, globalConversionFactor } from "@/lib/conversions";
import { getReferenceData } from "@/lib/reference-data";
import { requireUser } from "@/lib/auth-user";
import { revalidateIngredientPaths } from "@/lib/revalidate-kitchu";
import { actionError } from "@/app/actions/shared";
import {
  productReferencePayloadSchema,
  userProductStatePayloadSchema,
} from "@/lib/validation";

export async function savePrivateProduct(ingredientId: string, payload: unknown) {
  try {
    const user = await requireUser();
    const data = productReferencePayloadSchema.parse(payload);
    const [{ units, globalRatios }, ingredient] = await Promise.all([
      getReferenceData(),
      prisma.ingredient.findUnique({ where: { id: ingredientId }, include: { baseUnit: true } }),
    ]);
    if (!ingredient) throw new Error("Ingrédient introuvable.");

    const packageUnit = units.find((unit) => unit.id === data.packageUnitId);
    const effectiveFactor = effectiveToBaseFactor(
      packageUnit,
      ingredient.baseUnit,
      data.packageToBaseFactor,
      globalRatios,
      { allowSpecific: true, units },
    );
    if (effectiveFactor === null) {
      throw new Error("Ajoutez un ratio produit valide.");
    }

    const productData = {
      ingredientId,
      ownerId: user.id,
      store: data.store,
      brand: data.brand,
      name: data.name,
      imageUrl: data.imageUrl,
      storageType: data.storageType,
      packageQuantity: data.packageQuantity,
      packageUnitId: data.packageUnitId,
      packageToBaseFactor:
        globalConversionFactor(packageUnit, ingredient.baseUnit, globalRatios, units) !== null
          ? null
          : data.packageToBaseFactor,
      price: data.price,
      url: data.url,
      barcode: data.barcode,
      notes: data.notes,
      caloriesPer100g: data.caloriesPer100g,
      proteinPer100g: data.proteinPer100g,
      carbsPer100g: data.carbsPer100g,
      fatPer100g: data.fatPer100g,
    };

    const product = data.id
      ? await prisma.productReference.update({
          where: { id: data.id, ownerId: user.id },
          data: productData,
        })
      : await prisma.productReference.create({ data: productData });

    await prisma.userProductState.upsert({
      where: { userId_productReferenceId: { userId: user.id, productReferenceId: product.id } },
      create: {
        userId: user.id,
        productReferenceId: product.id,
        stockQuantity: data.stockQuantity,
      },
      update: { stockQuantity: data.stockQuantity },
    });

    revalidateIngredientPaths(ingredientId);
    return { ok: true as const, id: product.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function deletePrivateProduct(productReferenceId: string) {
  try {
    const user = await requireUser();
    const product = await prisma.productReference.delete({
      where: { id: productReferenceId, ownerId: user.id },
      select: { ingredientId: true },
    });
    revalidateIngredientPaths(product.ingredientId);
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveUserProductState(payload: unknown) {
  try {
    const user = await requireUser();
    const data = userProductStatePayloadSchema.parse(payload);
    const product = await prisma.productReference.findFirst({
      where: {
        id: data.productReferenceId,
        OR: [{ ownerId: null }, { ownerId: user.id }],
      },
      select: { id: true, ingredientId: true },
    });
    if (!product) throw new Error("Référence produit introuvable.");

    if (data.stockQuantity === null && data.priceOverride === null) {
      await prisma.userProductState.deleteMany({
        where: { userId: user.id, productReferenceId: product.id },
      });
    } else {
      await prisma.userProductState.upsert({
        where: { userId_productReferenceId: { userId: user.id, productReferenceId: product.id } },
        create: {
          userId: user.id,
          productReferenceId: product.id,
          stockQuantity: data.stockQuantity,
          priceOverride: data.priceOverride,
        },
        update: {
          stockQuantity: data.stockQuantity,
          priceOverride: data.priceOverride,
        },
      });
    }

    revalidateIngredientPaths(product.ingredientId);
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}
