import { loadEnv } from "./lib/load-env";
import { defineConfig } from "prisma/config";

loadEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a direct connection (db.prisma.io), not the pooled runtime URL.
    url:
      process.env.DIRECT_URL ??
      process.env.PRISMA_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "",
  },
});
