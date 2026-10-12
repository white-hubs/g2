import { runGenerate } from "./generate";
import { findRepoRoot } from "./repo-root";
import { runUpload } from "./run-upload";

export interface PublishOptions {
  setName: string;
  repoRoot?: string;
  only?: Set<string>;
  dryRun?: boolean;
  skipBuild?: boolean;
  outDir?: string;
  envOverrides?: Record<string, string>;
}

/** Convenience: generate then upload (ADR-0055). */
export async function runPublish(options: PublishOptions): Promise<number> {
  const repoRoot = options.repoRoot ?? findRepoRoot();
  console.log(`[release] publish set=${options.setName} (= generate + upload)`);

  const generated = await runGenerate({
    setName: options.setName,
    repoRoot,
    only: options.only,
    dryRun: options.dryRun,
    skipBuild: options.skipBuild,
    outDir: options.outDir,
    envOverrides: options.envOverrides,
  });
  if (generated.code !== 0) {
    return generated.code;
  }

  const uploadResult = await runUpload({
    setName: options.setName,
    repoRoot,
    only: options.only,
    dryRun: options.dryRun,
    version: generated.version,
  });
  if (!uploadResult.ok) {
    return uploadResult.code;
  }

  console.log("[release] publish complete");
  return 0;
}
