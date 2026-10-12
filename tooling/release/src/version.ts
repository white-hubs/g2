const RELEASE_VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;

export function releaseVersion(now = new Date(), sha = gitShortSha(), override = process.env.RELEASE_VERSION?.trim()): string {
  if (override) {
    if (!RELEASE_VERSION_PATTERN.test(override)) {
      throw new Error("RELEASE_VERSION must contain only letters, numbers, dots, underscores, and hyphens");
    }
    return override;
  }

  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}.${sha}`;
}

function gitShortSha(): string {
  const out = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"], { stdout: "pipe" });
  if (out.exitCode !== 0) {
    throw new Error("git rev-parse failed");
  }
  return new TextDecoder().decode(out.stdout).trim();
}
