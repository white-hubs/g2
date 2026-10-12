import { writeFileSync, rmSync } from "node:fs";

import { findAvailablePort } from "./cli";
import { findRepoRoot, shellSessionPath, terminateProcessGroup } from "./session";

const cwd = process.cwd();
const repoRoot = findRepoRoot(cwd);

const resolveProfile = Bun.spawnSync(
  [
    "bun",
    "run",
    "--filter",
    "@g2-composition/schema",
    "resolve",
    "--",
    "--profile",
    "deploy/compositions/prod.pc.yaml",
    "--registry",
    "deploy/compositions/registry/dev.registry.yaml",
    "--out",
    "deploy/compositions/.resolved/dev.pc.resolved.json",
  ],
  { cwd: repoRoot, stdout: "inherit", stderr: "inherit" },
);
if (resolveProfile.exitCode !== 0) {
  throw new Error(`failed to generate local composition profile (exit ${resolveProfile.exitCode})`);
}
const requestedPort = Number(process.env.G2_DEV_SHELL_PORT || 5100);
const port = await findAvailablePort(requestedPort);
const shellUrl = `http://localhost:${port}`;
const sessionPath = shellSessionPath(repoRoot);
const child = Bun.spawn(["bun", "run", "dev:serve", "--port", String(port), "--strictPort"], {
  cwd,
  env: { ...process.env, G2_DEV_SHELL_PORT: String(port), G2_DEV_SHELL_URL: shellUrl, G2_DEV_ORIGIN: shellUrl },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
  detached: true,
});

writeFileSync(sessionPath, JSON.stringify({ shellUrl, pid: child.pid, repoRoot, startedAt: Date.now() }));
console.log(`[g2-dev] shell coordination endpoint: ${shellUrl}`);

let stopping = false;
function stop(signal: NodeJS.Signals): void {
  if (stopping) return;
  stopping = true;
  rmSync(sessionPath, { force: true });
  terminateProcessGroup(child, signal);
}
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

const exitCode = await child.exited;
rmSync(sessionPath, { force: true });
process.exit(exitCode);
