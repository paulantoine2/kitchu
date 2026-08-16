import "server-only";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { matchesConfiguredAdminEmail } from "@/lib/multi-user";

export type Viewer = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "USER" | "ADMIN";
};

export class AuthorizationError extends Error {
  constructor(message = "Vous devez être connecté pour effectuer cette action.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

async function promoteAndClaimLegacyData(userId: string) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.user.updateMany({
      where: { id: userId, legacyDataClaimedAt: null },
      data: { role: "ADMIN", legacyDataClaimedAt: new Date() },
    });

    if (claimed.count === 0) {
      await tx.user.update({ where: { id: userId }, data: { role: "ADMIN" } });
      return;
    }

    const [legacyCart, legacyStock] = await Promise.all([
      tx.legacyCartItem.findMany(),
      tx.legacyProductStock.findMany(),
    ]);

    if (legacyCart.length > 0) {
      await tx.cartItem.createMany({
        data: legacyCart.map((item) => ({
          userId,
          recipeId: item.recipeId,
          portions: item.portions,
        })),
        skipDuplicates: true,
      });
    }

    if (legacyStock.length > 0) {
      await tx.userProductState.createMany({
        data: legacyStock.map((item) => ({
          userId,
          productReferenceId: item.productReferenceId,
          stockQuantity: item.stockQuantity,
        })),
        skipDuplicates: true,
      });
    }

    await Promise.all([
      tx.legacyCartItem.deleteMany(),
      tx.legacyProductStock.deleteMany(),
    ]);
  });
}

export async function getOptionalUser(): Promise<Viewer | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user.id) return null;

  let user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;

  if (
    matchesConfiguredAdminEmail(user.email, user.emailVerified, process.env.KITCHU_ADMIN_EMAIL) &&
    (user.role !== "ADMIN" || !user.legacyDataClaimedAt)
  ) {
    await promoteAndClaimLegacyData(user.id);
    user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
  };
}

export async function requireUser(): Promise<Viewer> {
  const user = await getOptionalUser();
  if (!user) throw new AuthorizationError();
  return user;
}

export async function requireAdmin(): Promise<Viewer> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new AuthorizationError("Cette action est réservée à l’administrateur.");
  }
  return user;
}
