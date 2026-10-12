import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

export function findRepoRoot(start: string): string {
  let current = start;
  while (true) {
    const packagePath = join(current, "package.json");
    if (existsSync(packagePath)) {
      const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as { workspaces?: unknown };
      if (pkg.workspaces) return current;
    }
    const parent = dirname(current);
    if (parent === current) throw new Error(`workspace root not found from ${start}`);
    current = parent;
  }
}

export function shellSessionPath(repoRoot: string): string {
  const key = createHash("sha256").update(repoRoot).digest("hex").slice(0, 12);
  return join(tmpdir(), `g2-dev-shell-${key}.json`);
}

export function terminateProcessGroup(child: ReturnType<typeof Bun.spawn>, signal: NodeJS.Signals): void {
  try {
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}
