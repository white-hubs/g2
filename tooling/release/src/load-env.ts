import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

import { findRepoRoot } from "./repo-root";

/**
 * Parse a dotenv-style file into a map (does not mutate process.env).
 */
export function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Merge file into `Bun.env` for keys that are still unset (or empty). */
export function mergeEnvFileIntoProcess(envPath: string, overrideExisting = false): void {
  const parsed = parseEnvFile(readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (overrideExisting || Bun.env[key] === undefined || Bun.env[key] === "") {
      Bun.env[key] = value;
    }
  }
}

/**
 * Load `deploy/docker-compose/.env` into `Bun.env` for keys that are still unset.
 * Compose already uses that file; host-side release CLI should too without requiring
 * the caller to `export` / `source` manually.
 */
export function loadReleaseEnvFile(repoRoot = findRepoRoot()): string | undefined {
  const envPath = join(repoRoot, "deploy/docker-compose/.env");
  if (!existsSync(envPath)) {
    return undefined;
  }

  mergeEnvFileIntoProcess(envPath);

  // Local compose often only sets MINIO_ROOT_*; mirror into RELEASE_S3_* when missing.
  if (!Bun.env.RELEASE_S3_ACCESS_KEY && Bun.env.MINIO_ROOT_USER) {
    Bun.env.RELEASE_S3_ACCESS_KEY = Bun.env.MINIO_ROOT_USER;
  }
  if (!Bun.env.RELEASE_S3_SECRET_KEY && Bun.env.MINIO_ROOT_PASSWORD) {
    Bun.env.RELEASE_S3_SECRET_KEY = Bun.env.MINIO_ROOT_PASSWORD;
  }
  if (!Bun.env.RELEASE_S3_ENDPOINT && Bun.env.MINIO_HOST_PORT) {
    Bun.env.RELEASE_S3_ENDPOINT = `http://127.0.0.1:${Bun.env.MINIO_HOST_PORT}`;
  }

  return envPath;
}

export function resolveEnvFilePath(envFile: string, repoRoot = findRepoRoot()): string {
  return isAbsolute(envFile) ? envFile : resolve(repoRoot, envFile);
}
