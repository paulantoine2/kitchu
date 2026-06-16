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

function resolveRuntimeConnectionString(connectionString: string) {
  // Vercel's Prisma Postgres integration provisions the direct host (db.prisma.io).
  // Runtime traffic with @prisma/adapter-pg must go through the pooler instead.
  if (
    connectionString.includes("@db.prisma.io") &&
    !connectionString.includes("pooled.db.prisma.io")
  ) {
    return connectionString.replace("@db.prisma.io", "@pooled.db.prisma.io");
  }

  return connectionString;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString: resolveRuntimeConnectionString(connectionString),
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
