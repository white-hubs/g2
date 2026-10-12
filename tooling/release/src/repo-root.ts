import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export function findRepoRoot(startDir = process.cwd()): string {
  const git = Bun.spawnSync(["git", "rev-parse", "--show-toplevel"], {
    cwd: startDir,
    stdout: "pipe",
  });
  if (git.exitCode === 0) {
    return new TextDecoder().decode(git.stdout).trim();
  }

  let dir = startDir;
  while (true) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
      if (pkg.name === "g2") {
        return dir;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  throw new Error("could not find repo root");
}
