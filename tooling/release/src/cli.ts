import { existsSync } from "node:fs";

import { defaultDeployOutDir, deployOutPaths } from "./deploy-out";
import { runGenerate } from "./generate";
import { loadReleaseEnvFile, mergeEnvFileIntoProcess, resolveEnvFilePath } from "./load-env";
import { loadReleaseSet } from "./load-release-set";
import { runPublish } from "./publish";
import { findRepoRoot } from "./repo-root";
import { runResolve } from "./run-resolve";
import { runUpload } from "./run-upload";

interface ParsedCli {
  set?: string;
  only?: string;
  outDir?: string;
  dryRun: boolean;
  skipBuild: boolean;
  envFile?: string;
  envOverrides: Record<string, string>;
}

function parseCli(argv: string[]): ParsedCli {
  const result: ParsedCli = {
    dryRun: false,
    skipBuild: false,
    envOverrides: {},
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--dry-run") {
      result.dryRun = true;
      continue;
    }
    if (arg === "--skip-build") {
      result.skipBuild = true;
      continue;
    }
    if (arg === "--env" || arg === "-e") {
      const pair = argv[++i];
      if (!pair) {
        throw new Error(`${arg} requires KEY=VALUE`);
      }
      const eq = pair.indexOf("=");
      if (eq <= 0) {
        throw new Error(`invalid ${arg} pair (expected KEY=VALUE): ${pair}`);
      }
      result.envOverrides[pair.slice(0, eq)] = pair.slice(eq + 1);
      continue;
    }
    if (arg.startsWith("--env=")) {
      const pair = arg.slice("--env=".length);
      const eq = pair.indexOf("=");
      if (eq <= 0) {
        throw new Error(`invalid --env= pair (expected KEY=VALUE): ${pair}`);
      }
      result.envOverrides[pair.slice(0, eq)] = pair.slice(eq + 1);
      continue;
    }
    if (arg.startsWith("-e=") && arg.length > 3) {
      const pair = arg.slice(3);
      const eq = pair.indexOf("=");
      if (eq <= 0) {
        throw new Error(`invalid -e= pair (expected KEY=VALUE): ${pair}`);
      }
      result.envOverrides[pair.slice(0, eq)] = pair.slice(eq + 1);
      continue;
    }
    if (arg.startsWith("--")) {
      const body = arg.slice(2);
      const eq = body.indexOf("=");
      if (eq === -1) {
        continue;
      }
      const key = body.slice(0, eq);
      const value = body.slice(eq + 1);
      if (key === "set") {
        result.set = value;
      } else if (key === "only") {
        result.only = value;
      } else if (key === "out-dir" || key === "out") {
        result.outDir = value;
      } else if (key === "env-file") {
        result.envFile = value;
      } else if (key === "dry-run") {
        result.dryRun = value !== "false";
      } else if (key === "skip-build") {
        result.skipBuild = value !== "false";
      }
    }
  }

  return result;
}

function parseOnlyFilter(only?: string): Set<string> | undefined {
  if (!only) {
    return undefined;
  }
  return new Set(
    only
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean),
  );
}

function requireSet(flags: ParsedCli): string {
  if (!flags.set) {
    throw new Error("missing required flag: --set=<name>");
  }
  return flags.set;
}

function applyCliEnv(flags: ParsedCli, repoRoot: string): void {
  if (flags.envFile) {
    const path = resolveEnvFilePath(flags.envFile, repoRoot);
    if (!existsSync(path)) {
      throw new Error(`--env-file not found: ${path}`);
    }
    mergeEnvFileIntoProcess(path, true);
  }
  for (const [key, value] of Object.entries(flags.envOverrides)) {
    process.env[key] = value;
  }
}

const USAGE =
  "[release] usage: bun ./src/cli.ts <generate|upload|publish|resolve> --set=<name> [--only=a,b] [--out-dir=...] [--skip-build] [--dry-run] [--env KEY=VALUE] [--env-file=path]";

async function runGenerateCommand(argv: string[]): Promise<number> {
  const flags = parseCli(argv);
  const setName = requireSet(flags);
  const repoRoot = findRepoRoot();
  applyCliEnv(flags, repoRoot);
  const result = await runGenerate({
    setName,
    only: parseOnlyFilter(flags.only),
    dryRun: flags.dryRun,
    skipBuild: flags.skipBuild,
    outDir: flags.outDir,
  });
  return result.code;
}

async function runUploadCommand(argv: string[]): Promise<number> {
  const flags = parseCli(argv);
  const setName = requireSet(flags);
  const repoRoot = findRepoRoot();
  applyCliEnv(flags, repoRoot);
  const result = await runUpload({
    setName,
    repoRoot,
    only: parseOnlyFilter(flags.only),
    dryRun: flags.dryRun,
  });
  return result.ok ? 0 : result.code;
}

async function runResolveCommand(argv: string[]): Promise<number> {
  const flags = parseCli(argv);
  const setName = requireSet(flags);
  const repoRoot = findRepoRoot();
  const releaseSet = loadReleaseSet(setName, repoRoot);
  const outDir = flags.outDir ?? defaultDeployOutDir(repoRoot, setName);
  const paths = deployOutPaths(outDir);
  if (!existsSync(paths.registry)) {
    console.error(`[release] registry missing at ${paths.registry}; run generate first`);
    return 1;
  }
  return runResolve(releaseSet, {
    registryPath: paths.registry,
    out: paths.resolved,
    dryRun: flags.dryRun,
  });
}

async function runPublishCommand(argv: string[]): Promise<number> {
  const flags = parseCli(argv);
  const setName = requireSet(flags);
  const repoRoot = findRepoRoot();
  applyCliEnv(flags, repoRoot);
  return runPublish({
    setName,
    only: parseOnlyFilter(flags.only),
    dryRun: flags.dryRun,
    skipBuild: flags.skipBuild,
    outDir: flags.outDir,
  });
}

async function main(): Promise<void> {
  const envPath = loadReleaseEnvFile();
  if (envPath) {
    console.log(`[release] loaded env from ${envPath}`);
  }

  const [subcommand, ...rest] = process.argv.slice(2);

  let code = 1;
  try {
    if (subcommand === "generate") {
      code = await runGenerateCommand(rest);
    } else if (subcommand === "upload") {
      code = await runUploadCommand(rest);
    } else if (subcommand === "resolve") {
      code = await runResolveCommand(rest);
    } else if (subcommand === "publish") {
      code = await runPublishCommand(rest);
    } else if (subcommand === "point") {
      console.error("[release] `point` removed (ADR-0055); use `generate` to write `.deploy-out/<set>/registry.yaml`");
      code = 1;
    } else {
      console.error(USAGE);
    }
  } catch (error) {
    console.error(`[release] ${error instanceof Error ? error.message : String(error)}`);
    console.error(USAGE);
    code = 1;
  }

  process.exit(code);
}

await main();
