import { resolve } from "node:path";

import { findForbiddenFiles } from "./find-forbidden-files";
import { findTrackedGeneratedPaths } from "./tracked-generated";

const repoRoot = resolve(import.meta.dirname, "../../..");
const roots = [resolve(repoRoot, "apps"), resolve(repoRoot, "packages"), resolve(repoRoot, "tooling")];
const forbidden = findForbiddenFiles(roots);

if (forbidden.length > 0) {
  console.error(`[forbidden-files] forbidden source/tooling files found (${forbidden.length}):`);
  for (const file of forbidden) {
    console.error(`  ${file}`);
  }
  console.error(
    "[forbidden-files] use defineComponent + TSX (ADR-0049); oxlint/oxfmt only (ADR-0006); no .js/.mjs/.cjs in apps|packages|tooling",
  );
  process.exit(1);
}

const ls = Bun.spawnSync(["git", "-C", repoRoot, "ls-files", "-z"], { stdout: "pipe", stderr: "pipe" });
if (ls.exitCode !== 0) {
  console.error("[forbidden-files] git ls-files failed:", new TextDecoder().decode(ls.stderr));
  process.exit(1);
}
const tracked = new TextDecoder()
  .decode(ls.stdout)
  .split("\0")
  .filter((p) => p.length > 0);
const trackedGenerated = findTrackedGeneratedPaths(tracked);

if (trackedGenerated.length > 0) {
  console.error(`[forbidden-files] generated/temp paths are tracked in git (${trackedGenerated.length}):`);
  for (const file of trackedGenerated) {
    console.error(`  ${file}`);
  }
  console.error("[forbidden-files] remove from the index and rely on .gitignore (ADR-0056)");
  process.exit(1);
}

console.log("[forbidden-files] ok: no forbidden source files; no tracked generated artifacts");
