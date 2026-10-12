import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

export type MfRuntimeMode = "external" | "bundled";
export type MfRuntimeRole = "host" | "remote";

export interface MfRuntimeConfig {
  role: MfRuntimeRole;
  /** Default: env → remote "external", host ignored for consume. */
  mode?: MfRuntimeMode;
  /**
   * Public origin for the runtime URL (no trailing slash).
   * Examples: `http://localhost:5100` (shell), `http://localhost:8081` (webReleaseBase).
   * Default: `G2_MF_RUNTIME_BASE` or `http://localhost:5100`.
   */
  baseUrl?: string;
}

export const MF_RUNTIME_FILE = "mf-runtime.js";
export const DEFAULT_MF_RUNTIME_BASE = "http://localhost:5100";
export const MF_RUNTIME_MODE_ENV = "G2_MF_RUNTIME_MODE";
export const MF_RUNTIME_SLIM_ENV = "G2_MF_RUNTIME_SLIM";
export const MF_RUNTIME_BASE_ENV = "G2_MF_RUNTIME_BASE";

export function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/u, "");
}

export function resolveMfRuntimePackageJson(): string {
  const require = createRequire(import.meta.url);
  try {
    return require.resolve("@module-federation/runtime/package.json");
  } catch {
    const vitePkg = require.resolve("@module-federation/vite/package.json");
    return createRequire(vitePkg).resolve("@module-federation/runtime/package.json");
  }
}

export function resolveMfRuntimeEsmEntry(): string {
  return join(dirname(resolveMfRuntimePackageJson()), "dist/index.js");
}

export function readMfRuntimeNpmVersion(): string {
  const pkg = JSON.parse(readFileSync(resolveMfRuntimePackageJson(), "utf8")) as { version?: string };
  if (!pkg.version) {
    throw new Error("@module-federation/runtime package.json missing version");
  }
  return pkg.version;
}

/** Object key / URL path under the public base (no leading slash in segments after base). */
export function mfRuntimeObjectKey(version = readMfRuntimeNpmVersion()): string {
  return `_mf/runtime/${version}/${MF_RUNTIME_FILE}`;
}

export function mfRuntimePublicPath(version = readMfRuntimeNpmVersion()): string {
  return `/${mfRuntimeObjectKey(version)}`;
}

export function mfRuntimePublicUrl(baseUrl: string, version = readMfRuntimeNpmVersion()): string {
  return `${stripTrailingSlash(baseUrl)}${mfRuntimePublicPath(version)}`;
}

export function resolveMfRuntimeBaseUrl(explicit?: string): string {
  const fromEnv = process.env[MF_RUNTIME_BASE_ENV]?.trim();
  return stripTrailingSlash(explicit || fromEnv || DEFAULT_MF_RUNTIME_BASE);
}

/**
 * Resolve consume mode for remotes.
 * - `G2_MF_RUNTIME_MODE=external|bundled` wins
 * - else `G2_MF_RUNTIME_SLIM=0` → bundled; unset/other → external
 */
export function resolveMfRuntimeMode(explicit?: MfRuntimeMode): MfRuntimeMode {
  if (explicit === "external" || explicit === "bundled") {
    return explicit;
  }
  const modeEnv = process.env[MF_RUNTIME_MODE_ENV]?.trim().toLowerCase();
  if (modeEnv === "external" || modeEnv === "bundled") {
    return modeEnv;
  }
  if (process.env[MF_RUNTIME_SLIM_ENV] === "0") {
    return "bundled";
  }
  return "external";
}

export function bundleMfRuntimeToFile(outFile: string, cwd = process.cwd()): void {
  mkdirSync(dirname(outFile), { recursive: true });
  const entry = resolveMfRuntimeEsmEntry();
  // Do not --minify: collapses named exports to default-only and breaks `import { init }`.
  const result = spawnSync("bun", ["build", entry, "--outfile", outFile, "--format=esm", "--target=browser"], {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`mf-runtime bundle failed:\n${result.stderr || result.stdout}`);
  }
}

export function isMfRuntimeModuleId(id: string): boolean {
  if (id.includes("/helpers") || id.endsWith("/helpers") || id.includes("@module-federation/runtime/helpers")) {
    return false;
  }
  const bare = id === "@module-federation/runtime" || id.startsWith("@module-federation/runtime/");
  const resolvedPath = id.includes("/node_modules/@module-federation/runtime/") || id.includes("/@module-federation/runtime/");
  return bare || resolvedPath;
}
