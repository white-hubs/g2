import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const SKIP_DIR_NAMES = new Set(["node_modules", "dist", "lib", "build", "out", ".git", ".turbo", "coverage", ".vite", ".deploy-out"]);

const FORBIDDEN_EXTENSIONS = new Set([".vue", ".jsx", ".js", ".mjs", ".cjs", ".svelte"]);

/** Node-only tooling configs that cannot be TypeScript (e.g. dependency-cruiser CLI). */
const ALLOWED_TOOLING_BASENAMES = new Set(["dependency-cruiser.config.mjs"]);

/**
 * 源码树禁止出现的文件名（ADR-0049 / ADR-0006 / ADR-0056）。
 * 只匹配 basename，不依赖目录深度。
 */
export function isForbiddenFileName(name: string): boolean {
  if (ALLOWED_TOOLING_BASENAMES.has(name)) {
    return false;
  }
  if (FORBIDDEN_EXTENSIONS.has(extnameLower(name))) {
    return true;
  }
  if (name === "biome.json" || name === "biome.jsonc") {
    return true;
  }
  if (name === ".eslintignore" || name === ".prettierignore") {
    return true;
  }
  if (name.startsWith(".eslintrc") || name.startsWith("eslint.config.")) {
    return true;
  }
  if (name.startsWith(".prettierrc") || name.startsWith("prettier.config.")) {
    return true;
  }
  if (name.startsWith(".babelrc") || name.startsWith("babel.config.")) {
    return true;
  }
  return false;
}

function extnameLower(name: string): string {
  const i = name.lastIndexOf(".");
  if (i <= 0) {
    return "";
  }
  return name.slice(i).toLowerCase();
}

/**
 * 递归收集 `roots` 下所有黑名单文件路径（绝对路径，排序）。
 * 跳过构建产物与依赖目录。
 */
export function findForbiddenFiles(roots: string[]): string[] {
  const found: string[] = [];

  function walk(dir: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (SKIP_DIR_NAMES.has(name)) {
        continue;
      }
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full);
      } else if (st.isFile() && isForbiddenFileName(name)) {
        found.push(full);
      }
    }
  }

  for (const root of roots) {
    walk(root);
  }
  return found.toSorted();
}
