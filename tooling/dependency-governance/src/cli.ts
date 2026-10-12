import { globSync, readFileSync } from "node:fs";

import { type Whitelist, checkPackageDependencies } from "./check-dependencies";

const whitelist = JSON.parse(readFileSync(new URL("../whitelist.json", import.meta.url), "utf8")) as Whitelist;
const packageJsonPaths = globSync("{apps,packages,tooling}/**/package.json", { exclude: ["**/node_modules/**", "**/dist/**"] });

let hasViolation = false;
for (const path of packageJsonPaths) {
  const pkg = JSON.parse(readFileSync(path, "utf8")) as { name: string; dependencies?: Record<string, string> };
  const violations = checkPackageDependencies(pkg, whitelist);
  for (const violation of violations) {
    hasViolation = true;
    console.error(`[dependency-governance] ${path}: ${violation}`);
  }
}

if (hasViolation) {
  process.exit(1);
}
console.log("[dependency-governance] all package.json dependencies comply with the whitelist");
