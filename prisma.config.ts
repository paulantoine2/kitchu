import { loadEnv } from "./lib/load-env";
import { defineConfig } from "prisma/config";

loadEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL ?? "",
  },
});
