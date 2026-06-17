import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function resolvePoolMax(): number {
  const configured = process.env.DATABASE_POOL_MAX;
  if (configured !== undefined && configured !== "") {
    const parsed = Number(configured);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return process.env.NODE_ENV === "production" ? 1 : 10;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString,
    max: resolvePoolMax(),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return new PrismaClient({ adapter });
}

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export { prisma };
