import { readFileSync, writeFileSync } from "node:fs";

const targetPath = process.argv[2] ?? ".env.production.local";

const VERCEL_METADATA_KEYS = new Set([
  "VERCEL",
  "VERCEL_ENV",
  "VERCEL_URL",
  "VERCEL_GIT_PROVIDER",
  "VERCEL_GIT_REPO_SLUG",
  "VERCEL_GIT_REPO_OWNER",
  "VERCEL_GIT_REPO_ID",
  "VERCEL_GIT_COMMIT_REF",
  "VERCEL_GIT_COMMIT_SHA",
  "VERCEL_GIT_COMMIT_MESSAGE",
  "VERCEL_GIT_COMMIT_AUTHOR_LOGIN",
  "VERCEL_GIT_COMMIT_AUTHOR_NAME",
  "VERCEL_GIT_PULL_REQUEST_ID",
  "VERCEL_OIDC_TOKEN",
  "TURBO_REMOTE_ONLY",
  "TURBO_RUN_SUMMARY",
  "TURBO_DOWNLOAD_LOCAL_ENABLED",
  "NX_DAEMON",
]);

const raw = readFileSync(targetPath, "utf8");
const kept = [];

for (const line of raw.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    kept.push(line);
    continue;
  }

  const key = trimmed.slice(0, trimmed.indexOf("="));
  if (VERCEL_METADATA_KEYS.has(key)) {
    continue;
  }

  kept.push(line);
}

writeFileSync(
  targetPath,
  `${kept.join("\n").replace(/\n+$/, "")}\n`,
  "utf8",
);

console.log(`Cleaned Vercel metadata from ${targetPath}`);
