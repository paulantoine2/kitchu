export type PersonalProductState = {
  stockQuantity: number | null;
  priceOverride: number | null;
} | null | undefined;

export function resolvePersonalProductState(catalogPrice: number, state: PersonalProductState) {
  return {
    catalogPrice,
    price: state?.priceOverride ?? catalogPrice,
    priceOverride: state?.priceOverride ?? null,
    stockQuantity: state?.stockQuantity ?? null,
  };
}

export function isProductVisibleToUser(ownerId: string | null, userId: string | null) {
  return ownerId === null || ownerId === userId;
}

export function canMutatePrivateProduct(ownerId: string | null, userId: string | null) {
  return Boolean(ownerId && userId && ownerId === userId);
}

export function matchesConfiguredAdminEmail(
  email: string,
  emailVerified: boolean,
  configuredEmail: string | undefined,
) {
  const expected = configuredEmail?.trim().toLocaleLowerCase("fr");
  return Boolean(expected && emailVerified && email.toLocaleLowerCase("fr") === expected);
}
