import type { LoadedReleaseSet } from "./load-release-set";

export interface RunResolveOptions {
  /** Absolute or repo-relative path to registry.yaml */
  registryPath: string;
  /** Absolute or repo-relative path for resolved.json */
  out: string;
  dryRun?: boolean;
}

export async function runResolve(releaseSet: LoadedReleaseSet, options: RunResolveOptions): Promise<number> {
  const args = [
    "run",
    "--filter",
    "@g2-composition/schema",
    "resolve",
    "--",
    "--profile",
    releaseSet.profile,
    "--registry",
    options.registryPath,
    "--out",
    options.out,
  ];

  if (options.dryRun) {
    console.log(`[release] resolve (dry-run): bun ${args.join(" ")}`);
    return 0;
  }

  const proc = Bun.spawn(["bun", ...args], {
    cwd: releaseSet.repoRoot,
    stdout: "inherit",
    stderr: "inherit",
  });

  return proc.exited;
}
