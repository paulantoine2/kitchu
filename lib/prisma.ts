import { statSync } from "node:fs";
import { join } from "node:path";
import { loadEnv } from "@/lib/load-env";

loadEnv();
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/app/generated/prisma/client";

const GENERATED_CLIENT_PATH = join(process.cwd(), "app/generated/prisma/client.ts");

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaGenerationTime?: number;
};

function generatedClientMtime() {
  try {
    return statSync(GENERATED_CLIENT_PATH).mtimeMs;
  } catch {
    return 0;
  }
}

function assertRuntimeDatabaseUrl(connectionString: string) {
  const usesPrismaPostgresDirect =
    connectionString.includes("db.prisma.io") &&
    !connectionString.includes("pooled.db.prisma.io");

  if (process.env.NODE_ENV === "production" && usesPrismaPostgresDirect) {
    console.error(
      "DATABASE_URL uses the direct Prisma Postgres host (db.prisma.io). Use pooled.db.prisma.io for application traffic to avoid connection exhaustion.",
    );
  }
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  assertRuntimeDatabaseUrl(connectionString);

  const pool = new Pool({
    connectionString,
    max: 1,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

function getPrismaClient() {
  if (process.env.NODE_ENV !== "production") {
    const generationTime = generatedClientMtime();
    if (globalForPrisma.prismaGenerationTime !== generationTime) {
      void globalForPrisma.prisma?.$disconnect();
      globalForPrisma.prisma = createPrismaClient();
      globalForPrisma.prismaGenerationTime = generationTime;
      return globalForPrisma.prisma;
    }
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const prisma = getPrismaClient();
