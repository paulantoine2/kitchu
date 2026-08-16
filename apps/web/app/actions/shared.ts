import { z } from "zod";

export function actionError(error: unknown) {
  if (error instanceof z.ZodError) {
    return { ok: false as const, error: error.issues[0]?.message ?? "Données invalides." };
  }
  if (error instanceof Error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: false as const, error: "Une erreur est survenue." };
}
