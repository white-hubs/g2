import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");
const configPath = resolve(import.meta.dirname, "../dependency-cruiser.config.mjs");
const depcruiseBin = resolve(import.meta.dirname, "../node_modules/dependency-cruiser/bin/dependency-cruise.mjs");

// Enumerate sources ourselves: bare dirs cruise 0 modules here; naive globs enter nested workspace node_modules (ENAMETOOLONG).
const list = Bun.spawnSync(
  [
    "find",
    "apps",
    "packages",
    "(",
    "-name",
    "*.ts",
    "-o",
    "-name",
    "*.tsx",
    ")",
    "!",
    "-path",
    "*/node_modules/*",
    "!",
    "-path",
    "*/dist/*",
  ],
  { cwd: repoRoot, stdout: "pipe", stderr: "pipe" },
);
if (list.exitCode !== 0) {
  console.error("[deps-graph] find failed:", new TextDecoder().decode(list.stderr));
  process.exit(1);
}
const files = new TextDecoder()
  .decode(list.stdout)
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);
if (files.length === 0) {
  console.error("[deps-graph] no source files found to cruise");
  process.exit(1);
}

const proc = Bun.spawnSync(["node", depcruiseBin, "--config", configPath, "--output-type", "err", ...files], {
  cwd: repoRoot,
  stdout: "inherit",
  stderr: "inherit",
});

if (proc.exitCode === 0) {
  console.log(`[deps-graph] ok: import graph respects ADR-0056/0057 boundaries (${files.length} modules scanned)`);
  process.exit(0);
}

console.error(`[deps-graph] boundary check failed (exit ${proc.exitCode ?? "unknown"})`);
process.exit(proc.exitCode ?? 1);
