"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ingredientPayloadSchema } from "@/lib/validation";
import { effectiveToBaseFactor, globalConversionFactor } from "@/lib/conversions";
import { actionError } from "@/app/actions/shared";
import { supportsIngredientSpecificRatio } from "@/app/actions/unit-helpers";
import { revalidateKitchuPaths } from "@/lib/revalidate-kitchu";

export async function saveIngredient(payload: unknown) {
  try {
    const data = ingredientPayloadSchema.parse(payload);
    const units = data.units.some((unit) => unit.unitId === data.baseUnitId)
      ? data.units
      : [{ unitId: data.baseUnitId, toBaseFactor: null }, ...data.units];
    const unitRecords = await prisma.unit.findMany({
      where: {
        id: {
          in: Array.from(
            new Set([
              data.baseUnitId,
              ...units.map((unit) => unit.unitId),
              ...data.products.map((product) => product.packageUnitId),
            ]),
          ),
        },
      },
    });
    const allUnits = await prisma.unit.findMany();
    const globalRatios = await prisma.unitRatio.findMany();
    const unitById = new Map(unitRecords.map((unit) => [unit.id, unit]));
    const baseUnit = unitById.get(data.baseUnitId);

    if (!baseUnit) {
      throw new Error("Choisis une unité de base valide.");
    }

    const normalizedUnits = units.map((unit) => {
      const unitRecord = unitById.get(unit.unitId);
      const globalFactor = globalConversionFactor(unitRecord, baseUnit, globalRatios, allUnits);
      if (globalFactor !== null) {
        return { unitId: unit.unitId, toBaseFactor: null };
      }
      if (supportsIngredientSpecificRatio(unitRecord) && unit.toBaseFactor) {
        return { unitId: unit.unitId, toBaseFactor: unit.toBaseFactor };
      }
      throw new Error("Ajoute un ratio spécifique à l'ingrédient ou définis une conversion dans l'onglet Unités.");
    });
    const normalizedProducts = data.products.map((product) => {
      const packageUnit = unitById.get(product.packageUnitId);
      const effectiveFactor = effectiveToBaseFactor(
        packageUnit,
        baseUnit,
        product.packageToBaseFactor,
        globalRatios,
        { allowSpecific: true, units: allUnits },
      );
      if (effectiveFactor === null) {
        throw new Error("Ajoute un ratio produit ou définis une conversion dans l'onglet Unités.");
      }

      return {
        ...product,
        packageToBaseFactor: globalConversionFactor(packageUnit, baseUnit, globalRatios, allUnits) !== null
          ? null
          : product.packageToBaseFactor,
      };
    });

    const ingredient = await prisma.$transaction(async (tx) => {
      const saved = data.id
        ? await tx.ingredient.update({
            where: { id: data.id },
            data: {
              name: data.name,
              imageUrl: data.imageUrl,
              notes: data.notes,
              baseUnitId: data.baseUnitId,
            },
          })
        : await tx.ingredient.create({
            data: {
              name: data.name,
              imageUrl: data.imageUrl,
              notes: data.notes,
              baseUnitId: data.baseUnitId,
            },
          });

      await tx.ingredientUnit.deleteMany({ where: { ingredientId: saved.id } });
      await tx.ingredientUnit.createMany({
        data: normalizedUnits.map((unit) => ({
          ingredientId: saved.id,
          unitId: unit.unitId,
          toBaseFactor: unit.toBaseFactor,
        })),
      });

      await tx.productReference.deleteMany({ where: { ingredientId: saved.id } });
      if (normalizedProducts.length) {
        await tx.productReference.createMany({
          data: normalizedProducts.map((product) => ({
            ingredientId: saved.id,
            store: product.store,
            brand: product.brand,
            name: product.name,
            imageUrl: product.imageUrl,
            packageQuantity: product.packageQuantity,
            packageUnitId: product.packageUnitId,
            packageToBaseFactor: product.packageToBaseFactor,
            price: product.price,
            url: product.url,
            barcode: product.barcode,
            notes: product.notes,
          })),
        });
      }

      if (data.stockQuantity === null || data.stockQuantity === 0) {
        await tx.stockEntry.deleteMany({ where: { ingredientId: saved.id } });
      } else {
        await tx.stockEntry.upsert({
          where: { ingredientId: saved.id },
          create: { ingredientId: saved.id, quantity: data.stockQuantity },
          update: { quantity: data.stockQuantity },
        });
      }

      return saved;
    });

    const fullIngredient = await prisma.ingredient.findUniqueOrThrow({
      where: { id: ingredient.id },
      include: {
        baseUnit: true,
        stock: true,
        units: { include: { unit: true }, orderBy: { unit: { name: "asc" } } },
        products: { include: { packageUnit: true }, orderBy: { updatedAt: "desc" } },
      },
    });

    revalidateKitchuPaths({ ingredientId: fullIngredient.id });
    return {
      ok: true as const,
      id: fullIngredient.id,
      ingredient: {
        ...fullIngredient,
        stock: fullIngredient.stock ? { quantity: fullIngredient.stock.quantity } : null,
      },
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function createIngredientQuick(
  name: string,
  options?: { baseUnitCode?: string; unitCodes?: string[] },
) {
  try {
    const trimmed = z.string().trim().min(1).parse(name);
    const requestedCodes = Array.from(
      new Set([options?.baseUnitCode ?? "g", ...(options?.unitCodes ?? [])].filter(Boolean)),
    );
    const [allUnits, globalRatios] = await Promise.all([
      prisma.unit.findMany(),
      prisma.unitRatio.findMany(),
    ]);
    const unitByCode = new Map(allUnits.map((unit) => [unit.code, unit]));
    const baseUnit = unitByCode.get(options?.baseUnitCode ?? "g") ?? unitByCode.get("g");
    if (!baseUnit) {
      throw new Error("Unité de base introuvable.");
    }

    const allowedCodes = requestedCodes.filter((code) => {
      const unit = unitByCode.get(code);
      if (!unit) return false;
      return unit.id === baseUnit.id || globalConversionFactor(unit, baseUnit, globalRatios, allUnits) === null;
    });
    const ingredient = await prisma.ingredient.upsert({
      where: { name: trimmed },
      update: {},
      create: {
        name: trimmed,
        baseUnitId: baseUnit.id,
        units: {
          create: (allowedCodes.length ? allowedCodes : [baseUnit.code]).map((code) => ({
            unitId: unitByCode.get(code)!.id,
            toBaseFactor: null,
          })),
        },
      },
      include: {
        baseUnit: true,
        stock: true,
        units: { include: { unit: true }, orderBy: { unit: { name: "asc" } } },
        products: { include: { packageUnit: true }, orderBy: { updatedAt: "desc" } },
      },
    });
    revalidateKitchuPaths({ ingredientId: ingredient.id });
    return {
      ok: true as const,
      ingredient: {
        ...ingredient,
        stock: ingredient.stock ? { quantity: ingredient.stock.quantity } : null,
      },
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function addIngredientUnitQuick(ingredientId: string, unitCode: string) {
  try {
    const id = z.string().min(1).parse(ingredientId);
    const code = z.string().trim().min(1).parse(unitCode);
    const [unit, ingredient, allUnits, globalRatios] = await Promise.all([
      prisma.unit.findUnique({ where: { code } }),
      prisma.ingredient.findUnique({ where: { id }, include: { baseUnit: true } }),
      prisma.unit.findMany(),
      prisma.unitRatio.findMany(),
    ]);
    if (!unit) {
      return { ok: false as const, error: `Unité « ${code} » introuvable.` };
    }
    if (!ingredient) {
      return { ok: false as const, error: "Ingrédient introuvable." };
    }

    if (globalConversionFactor(unit, ingredient.baseUnit, globalRatios, allUnits) === null) {
      await prisma.ingredientUnit.upsert({
        where: { ingredientId_unitId: { ingredientId: id, unitId: unit.id } },
        update: {},
        create: {
          ingredientId: id,
          unitId: unit.id,
          toBaseFactor: null,
        },
      });
    }

    const updatedIngredient = await prisma.ingredient.findUniqueOrThrow({
      where: { id },
      include: {
        baseUnit: true,
        stock: true,
        units: { include: { unit: true }, orderBy: { unit: { name: "asc" } } },
        products: { include: { packageUnit: true }, orderBy: { updatedAt: "desc" } },
      },
    });

    revalidateKitchuPaths({ ingredientId: id });
    return {
      ok: true as const,
      ingredient: {
        ...updatedIngredient,
        stock: updatedIngredient.stock ? { quantity: updatedIngredient.stock.quantity } : null,
      },
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteIngredient(id: string) {
  try {
    await prisma.ingredient.delete({ where: { id } });
    revalidateKitchuPaths({ ingredientId: id });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Impossible de supprimer cet ingrédient s'il est utilisé dans une recette.",
    };
  }
}
