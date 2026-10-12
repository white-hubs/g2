export interface ManifestBuildInfo {
  metaData: { buildInfo: { buildVersion: string } };
}

export interface CheckForNewerVersionDeps {
  renderedVersion: string;
  fetchManifest: () => Promise<ManifestBuildInfo>;
}

export async function checkForNewerVersion(deps: CheckForNewerVersionDeps): Promise<boolean> {
  try {
    const manifest = await deps.fetchManifest();
    return manifest.metaData.buildInfo.buildVersion !== deps.renderedVersion;
  } catch {
    return false;
  }
}

export function startOverridePolling(deps: CheckForNewerVersionDeps & { onNewerVersion: () => void; intervalMs?: number }): () => void {
  const interval = setInterval(async () => {
    if (await checkForNewerVersion(deps)) {
      deps.onNewerVersion();
    }
  }, deps.intervalMs ?? 60_000);
  return () => clearInterval(interval);
}
