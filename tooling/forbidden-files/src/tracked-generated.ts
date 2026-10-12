const GENERATED_DIR_SEGMENTS = new Set(["dist", "lib", "build", "out", ".turbo", "coverage", ".vite", ".deploy-out"]);

/**
 * 从已跟踪路径列表中找出不应入库的生成物 / 临时文件（ADR-0056）。
 * `trackedPaths` 使用 posix 风格相对路径（与 `git ls-files` 一致）。
 */
export function findTrackedGeneratedPaths(trackedPaths: string[]): string[] {
  const hit: string[] = [];
  for (const path of trackedPaths) {
    if (isTrackedGeneratedPath(path)) {
      hit.push(path);
    }
  }
  return hit.toSorted();
}

export function isTrackedGeneratedPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  if (normalized.endsWith(".tsbuildinfo")) {
    return true;
  }
  if (normalized.includes("vite.timestamp") || /\.timestamp-\d+\.mjs$/i.test(normalized)) {
    return true;
  }
  if (normalized === "deploy/compositions/.resolved" || normalized.startsWith("deploy/compositions/.resolved/")) {
    return true;
  }
  const segments = normalized.split("/");
  for (const segment of segments) {
    if (GENERATED_DIR_SEGMENTS.has(segment)) {
      return true;
    }
  }
  return false;
}
