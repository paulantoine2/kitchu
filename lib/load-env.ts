import { existsSync } from "node:fs";
import { config } from "dotenv";

export function loadEnv() {
  if (process.env.VERCEL) {
    return;
  }

  if (existsSync(".env.local")) {
    config({ path: ".env.local", override: true });
  }
}
