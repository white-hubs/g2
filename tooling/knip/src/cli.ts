import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../../..");
const knipBin = resolve(import.meta.dirname, "../node_modules/knip/bin/knip.js");
const configPath = resolve(import.meta.dirname, "../knip.json");

const proc = Bun.spawnSync(
  [
    "node",
    knipBin,
    "--config",
    configPath,
    "--include",
    "files,dependencies,unlisted,binaries,unresolved",
    "--no-progress",
    "--no-config-hints",
  ],
  {
    cwd: repoRoot,
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env },
  },
);

if (proc.exitCode === 0) {
  console.log("[knip] ok");
  process.exit(0);
}

console.error(
  `[knip] failed (exit ${proc.exitCode ?? "unknown"}) — fix real dead code or document ignore in tooling/knip/README.md (ADR-0056)`,
);
process.exit(proc.exitCode ?? 1);
