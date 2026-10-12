import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { findRepoRoot } from "./repo-root";

function listPackageJsonPaths(repoRoot: string): string[] {
  const rootPkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
    workspaces?: string[];
  };
  const paths: string[] = [];

  for (const pattern of rootPkg.workspaces ?? []) {
    if (pattern.endsWith("/*")) {
      const parent = join(repoRoot, pattern.slice(0, -2));
      if (!existsSync(parent)) {
        continue;
      }
      for (const entry of readdirSync(parent, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === "node_modules" || entry.name === "dist") {
          continue;
        }
        const pkgPath = join(parent, entry.name, "package.json");
        if (existsSync(pkgPath)) {
          paths.push(pkgPath);
        }
      }
      continue;
    }

    const pkgPath = join(repoRoot, pattern, "package.json");
    if (existsSync(pkgPath)) {
      paths.push(pkgPath);
    }
  }

  return paths;
}

export function findWorkspacePackagePath(packageName: string, repoRoot = findRepoRoot()): string {
  for (const pkgPath of listPackageJsonPaths(repoRoot)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
    if (pkg.name === packageName) {
      return dirname(pkgPath);
    }
  }
  throw new Error(`workspace package not found: ${packageName}`);
}
