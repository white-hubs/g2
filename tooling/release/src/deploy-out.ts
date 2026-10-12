import { join } from "node:path";

export const DEPLOY_OUT_DIRNAME = ".deploy-out";

export function defaultDeployOutDir(repoRoot: string, setName: string): string {
  return join(repoRoot, DEPLOY_OUT_DIRNAME, setName);
}

export function deployOutPaths(outDir: string): {
  registry: string;
  resolved: string;
  shellNginx: string;
} {
  return {
    registry: join(outDir, "registry.yaml"),
    resolved: join(outDir, "resolved.json"),
    shellNginx: join(outDir, "shell-location.conf"),
  };
}
