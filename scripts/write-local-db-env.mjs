import { writeFileSync } from "node:fs";

const LOCAL_DATABASE_URL =
  "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";

const content = `# Local development — Prisma Postgres (pnpm db:local)
# Production vars live on Vercel. Use "pnpm env:pull" to fetch them into .env.production.local.

DATABASE_URL="${LOCAL_DATABASE_URL}"
PRISMA_DATABASE_URL="${LOCAL_DATABASE_URL}"
`;

writeFileSync(".env.local", content, "utf8");

console.log("Wrote .env.local with local Prisma dev database URLs.");
console.log("Run pnpm db:migrate:deploy && pnpm db:seed if the schema is not up to date.");
