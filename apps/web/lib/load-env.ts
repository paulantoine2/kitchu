import { existsSync } from "node:fs";
import { config } from "dotenv";

const LOCAL_ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
] as const;

export function loadEnv() {
  if (process.env.VERCEL) {
    return;
  }

  for (const file of LOCAL_ENV_FILES) {
    if (existsSync(file)) {
      config({ path: file, override: false });
    }
  }
}
