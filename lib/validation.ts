import { z } from "zod";

const optionalText = z.string().trim().optional().transform((value) => value || null);
const positiveNumber = z.coerce.number().positive();
const nonNegativeInteger = z.coerce.number().int().nonnegative().optional().nullable();

export const unitPayloadSchema = z.object({
  id: z.string().optional().nullable(),
  code: z
    .string()
    .trim()
    .min(1, "Le code est requis.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Le code peut contenir lettres, chiffres, tirets et underscores."),
  name: z.string().trim().min(1, "Le nom est requis."),
  symbol: z.string().trim().min(1, "Le symbole est requis."),
  kind: z.enum(["MASS", "VOLUME", "COUNT", "PACKAGE", "CUSTOM"]),
});

export const ingredientPayloadSchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string().trim().min(1, "Le nom est requis."),
  imageUrl: optionalText,
  notes: optionalText,
  baseUnitId: z.string().min(1, "Choisis un type de mesure."),
  units: z
    .array(
      z.object({
        unitId: z.string().min(1),
        toBaseFactor: z
          .union([z.literal(""), positiveNumber])
          .optional()
          .nullable()
          .transform((value) => (value === "" || value == null ? null : value)),
      }),
    )
    .min(1, "Choisis un type de mesure."),
  products: z.array(
    z.object({
      id: z.string().optional().nullable(),
      store: z.string().trim().min(1, "Le magasin est requis."),
      brand: optionalText,
      name: z.string().trim().min(1, "Le nom produit est requis."),
      imageUrl: optionalText,
      packageQuantity: positiveNumber,
      packageUnitId: z.string().min(1, "Choisis l'unité du produit."),
      packageToBaseFactor: z
        .union([z.literal(""), positiveNumber])
        .optional()
        .nullable()
        .transform((value) => (value === "" || value == null ? null : value)),
      price: z.coerce.number().nonnegative(),
      url: optionalText,
      barcode: optionalText,
      notes: optionalText,
    }),
  ),
  stockQuantity: z
    .union([z.literal(""), z.coerce.number().nonnegative()])
    .optional()
    .nullable()
    .transform((value) => (value === "" || value == null ? null : value)),
});

export const recipePayloadSchema = z.object({
  id: z.string().optional().nullable(),
  name: z.string().trim().min(1, "Le titre est requis."),
  imageUrl: optionalText,
  description: optionalText,
  sourceUrl: optionalText,
  prepMinutes: nonNegativeInteger,
  cookMinutes: nonNegativeInteger,
  ingredients: z
    .array(
      z.object({
        ingredientId: z.string().min(1, "Choisis un ingrédient."),
        unitId: z.string().min(1, "Choisis une unité."),
        quantityPerServing: positiveNumber,
        note: optionalText,
      }),
    )
    .min(1, "Ajoute au moins un ingrédient."),
  steps: z
    .array(
      z.object({
        instruction: z.string().trim().min(1, "L'étape ne peut pas être vide."),
      }),
    )
    .min(1, "Ajoute au moins une étape."),
});

export const unitRatioPayloadSchema = z.object({
  id: z.string().optional().nullable(),
  fromUnitId: z.string().min(1, "Choisis l'unité source."),
  toUnitId: z.string().min(1, "Choisis l'unité de référence."),
  factor: positiveNumber,
});

export const cartItemPayloadSchema = z.object({
  recipeId: z.string().min(1, "La recette est requise."),
  portions: z.coerce.number().int().min(1, "Au moins une portion."),
});
