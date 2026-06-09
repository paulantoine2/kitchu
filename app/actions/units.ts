"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { unitPayloadSchema, unitRatioPayloadSchema } from "@/lib/validation";
import { globalConversionFactor } from "@/lib/conversions";
import { actionError } from "@/app/actions/shared";
import { revalidateKitchuPaths } from "@/lib/revalidate-kitchu";
import {
  isHardcodedMeasurementUnit,
  normalizeConfigurableUnitRatio,
} from "@/app/actions/unit-helpers";

export async function saveUnit(payload: unknown) {
  try {
    const data = unitPayloadSchema.parse(payload);
    const unitWithCode = await prisma.unit.findUnique({ where: { code: data.code } });
    if (unitWithCode && unitWithCode.id !== data.id) {
      return { ok: false as const, error: "Ce code d'unité existe déjà." };
    }
    const unit = data.id
      ? await prisma.unit.update({
          where: { id: data.id },
          data: {
            code: data.code,
            name: data.name,
            symbol: data.symbol,
            kind: data.kind,
          },
        })
      : await prisma.unit.create({
          data: {
            code: data.code,
            name: data.name,
            symbol: data.symbol,
            kind: data.kind,
          },
        });

    revalidateKitchuPaths({ unitId: unit.id });
    return { ok: true as const, id: unit.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteUnit(id: string, options?: { force?: boolean }) {
  try {
    const unitId = z.string().min(1).parse(id);
    const unit = await prisma.unit.findUnique({ where: { id: unitId } });
    if (isHardcodedMeasurementUnit(unit)) {
      return { ok: false as const, error: "Les unités de masse et de volume sont définies dans le code." };
    }
    if (options?.force) {
      await prisma.$transaction(async (tx) => {
        await tx.ingredient.deleteMany({ where: { baseUnitId: unitId } });
        await tx.recipeIngredient.deleteMany({ where: { unitId } });
        await tx.productReference.deleteMany({ where: { packageUnitId: unitId } });
        await tx.ingredientUnit.deleteMany({ where: { unitId } });
        await tx.unitRatio.deleteMany({
          where: { OR: [{ fromUnitId: unitId }, { toUnitId: unitId }] },
        });
        await tx.unit.delete({ where: { id: unitId } });
      });
    } else {
      await prisma.unit.delete({ where: { id: unitId } });
    }
    revalidateKitchuPaths({ unitId });
    return { ok: true as const };
  } catch {
    return {
      ok: false as const,
      error: "Impossible de supprimer cette unité tant qu'elle est utilisée.",
    };
  }
}

export async function saveUnitRatio(payload: unknown) {
  try {
    const data = unitRatioPayloadSchema.parse(payload);
    if (data.fromUnitId === data.toUnitId) {
      return { ok: false as const, error: "Choisis deux unités différentes." };
    }
    const allUnits = await prisma.unit.findMany();
    const fromUnit = allUnits.find((unit) => unit.id === data.fromUnitId);
    const toUnit = allUnits.find((unit) => unit.id === data.toUnitId);
    if (globalConversionFactor(fromUnit, toUnit, [], allUnits) !== null) {
      return {
        ok: false as const,
        error: "Cette conversion est immuable et définie dans le code.",
      };
    }
    const normalizedData = normalizeConfigurableUnitRatio(data, allUnits);
    if (!normalizedData) {
      return {
        ok: false as const,
        error: "Un ratio configurable doit relier une unité externe à la masse ou au volume.",
      };
    }
    if (normalizedData.fromUnitId === normalizedData.toUnitId) {
      return { ok: false as const, error: "Choisis deux unités différentes." };
    }

    const existing = normalizedData.id
      ? await prisma.unitRatio.findUnique({ where: { id: normalizedData.id } })
      : await prisma.unitRatio.findFirst({
          where: {
            OR: [
              { fromUnitId: normalizedData.fromUnitId, toUnitId: normalizedData.toUnitId },
              { fromUnitId: normalizedData.toUnitId, toUnitId: normalizedData.fromUnitId },
            ],
          },
        });

    const saved = existing
      ? await prisma.unitRatio.update({
          where: { id: existing.id },
          data: {
            fromUnitId: normalizedData.fromUnitId,
            toUnitId: normalizedData.toUnitId,
            factor: normalizedData.factor,
          },
        })
      : await prisma.unitRatio.create({
          data: {
            fromUnitId: normalizedData.fromUnitId,
            toUnitId: normalizedData.toUnitId,
            factor: normalizedData.factor,
          },
        });

    revalidateKitchuPaths();
    return { ok: true as const, id: saved.id };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteUnitRatio(id: string) {
  try {
    await prisma.unitRatio.delete({ where: { id } });
    revalidateKitchuPaths();
    return { ok: true as const };
  } catch (error) {
    return actionError(error);
  }
}
