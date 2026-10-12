import { MF_RUNTIME_BASE_ENV } from "@g2-tooling/mf-vite";
import { existsSync, mkdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";

import { bindAddressEnv, loadAddressTemplateKeys } from "./address-template";
import { defaultDeployOutDir, deployOutPaths } from "./deploy-out";
import { type ReleaseMember, loadReleaseSet } from "./load-release-set";
import { loadRegistryValue, pointRegistry, writeRegistryFile } from "./point-registry";
import { writeShellNginxConf } from "./render-shell-nginx";
import { findRepoRoot } from "./repo-root";
import { runResolve } from "./run-resolve";
import { releaseVersion } from "./version";

export interface GenerateOptions {
  setName: string;
  repoRoot?: string;
  only?: Set<string>;
  dryRun?: boolean;
  skipBuild?: boolean;
  outDir?: string;
  /** Extra KEY=VALUE pairs applied before binding address env. */
  envOverrides?: Record<string, string>;
}

async function runBuild(members: ReleaseMember[], repoRoot: string, dryRun: boolean, webReleaseBase?: string): Promise<number> {
  const filters = members.flatMap((member) => ["--filter", member.package]);
  // `turbo.json` keeps high concurrency for persistent dev servers. A production release
  // starts many Vite/MF type-generation tasks, so cap this one-shot build to avoid
  // exhausting local process resources and leaving a worker permanently stalled.
  const buildConcurrency = process.env.G2_RELEASE_BUILD_CONCURRENCY ?? "4";
  const args = ["turbo", "run", "build", `--concurrency=${buildConcurrency}`, ...filters];
  const env = { ...process.env };
  // Bun auto-loads package `.env.development` when NODE_ENV is unset; pin production so
  // `@g2-shell/pc` does not bake Vite-dev profile URLs into the release shell.
  env.NODE_ENV = "production";
  env.VITE_RESOLVED_PROFILE_URL = "/compositions/prod.resolved.json";
  if (webReleaseBase) {
    env[MF_RUNTIME_BASE_ENV] = webReleaseBase;
  }

  if (dryRun) {
    console.log(`[release] build (dry-run): bunx ${args.join(" ")}${webReleaseBase ? ` ${MF_RUNTIME_BASE_ENV}=${webReleaseBase}` : ""}`);
    return 0;
  }

  console.log(`[release] build: bunx ${args.join(" ")}${webReleaseBase ? ` (${MF_RUNTIME_BASE_ENV}=${webReleaseBase})` : ""}`);
  const proc = Bun.spawn(["bunx", ...args], {
    cwd: repoRoot,
    stdout: "inherit",
    stderr: "inherit",
    env,
  });

  return proc.exited;
}

function applyEnvOverrides(overrides: Record<string, string> | undefined): void {
  if (!overrides) {
    return;
  }
  for (const [key, value] of Object.entries(overrides)) {
    process.env[key] = value;
  }
}

export function memberEntryKeys(members: ReleaseMember[], version: string): Record<string, string> {
  return Object.fromEntries(members.map((member) => [member.logicalName, `${member.logicalName}/${version}/${member.entryFile}`]));
}

export async function runGenerate(options: GenerateOptions): Promise<{ code: number; outDir: string; version: string }> {
  const repoRoot = options.repoRoot ?? findRepoRoot();
  const dryRun = Boolean(options.dryRun);
  const releaseSet = loadReleaseSet(options.setName, repoRoot);
  const members = options.only ? releaseSet.members.filter((member) => options.only!.has(member.logicalName)) : releaseSet.members;

  if (members.length === 0) {
    console.error("[release] no members matched --only filter");
    return { code: 1, outDir: "", version: "" };
  }

  applyEnvOverrides(options.envOverrides);

  const outDir = options.outDir
    ? isAbsolute(options.outDir)
      ? options.outDir
      : join(repoRoot, options.outDir)
    : defaultDeployOutDir(repoRoot, options.setName);
  const paths = deployOutPaths(outDir);
  const version = releaseVersion();

  console.log(
    `[release] generate set=${options.setName} version=${version} outDir=${outDir} dryRun=${dryRun} skipBuild=${Boolean(options.skipBuild)}`,
  );

  let addressEntries: Record<string, string>;
  try {
    const keys = loadAddressTemplateKeys(releaseSet.addressTemplatePath);
    addressEntries = bindAddressEnv(keys);
  } catch (error) {
    console.error(`[release] ${error instanceof Error ? error.message : String(error)}`);
    return { code: 1, outDir, version };
  }

  if (!options.skipBuild) {
    const buildCode = await runBuild(members, repoRoot, dryRun, addressEntries.webReleaseBase);
    if (buildCode !== 0) {
      return { code: buildCode, outDir, version };
    }
  }

  const entryMap = memberEntryKeys(members, version);
  const registryPatch = { ...addressEntries, ...entryMap };

  if (!dryRun) {
    mkdirSync(outDir, { recursive: true });
  }

  // `--only` 必须 merge：全量覆盖会抹掉未选中的 logicalName，随后 resolve 必挂。
  if (options.only) {
    if (!existsSync(paths.registry)) {
      console.error(`[release] --only requires an existing registry at ${paths.registry}; run full generate first`);
      return { code: 1, outDir, version };
    }
    pointRegistry(paths.registry, registryPatch, { dryRun });
  } else {
    writeRegistryFile(paths.registry, registryPatch, { dryRun });
  }
  console.log(`[release] registry → ${paths.registry}`);

  const resolveCode = await runResolve(releaseSet, {
    registryPath: paths.registry,
    out: paths.resolved,
    dryRun,
  });
  if (resolveCode !== 0) {
    return { code: resolveCode, outDir, version };
  }

  const pcShellKey = entryMap.pcShell ?? (dryRun ? undefined : loadRegistryValue(paths.registry, "pcShell"));
  if (!pcShellKey) {
    console.error("[release] pcShell missing from registry (include pcShell in generate, or run full generate first)");
    return { code: 1, outDir, version };
  }

  writeShellNginxConf(paths.shellNginx, pcShellKey, { dryRun });
  console.log("[release] generate complete");
  return { code: 0, outDir, version };
}
