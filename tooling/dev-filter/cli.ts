import { collectProfilePackages, loadSourceProfile, resolveRepoRoot, selectPackages, toTurboFilters, type DevFilterMode } from "./packages";

function parseMode(argv: string[]): { mode: DevFilterMode; profileArg?: string } {
  let mode: DevFilterMode = "all";
  let profileArg: string | undefined;
  for (const arg of argv) {
    if (arg === "--chrome" || arg === "--mode=chrome") {
      mode = "chrome";
      continue;
    }
    if (arg === "--rest" || arg === "--mode=rest") {
      mode = "rest";
      continue;
    }
    if (arg === "--all" || arg === "--mode=all") {
      mode = "all";
      continue;
    }
    if (arg.startsWith("--mode=")) {
      const value = arg.slice("--mode=".length);
      if (value === "chrome" || value === "rest" || value === "all") {
        mode = value;
        continue;
      }
      throw new Error(`unknown --mode=${value}; expected chrome|rest|all`);
    }
    if (!arg.startsWith("-")) {
      profileArg = arg;
    }
  }
  return { mode, profileArg };
}

const { mode, profileArg } = parseMode(process.argv.slice(2));
const inputPath = profileArg ?? "deploy/compositions/prod.pc.yaml";
const repoRoot = resolveRepoRoot();
const profile = loadSourceProfile(inputPath, repoRoot);
const packages = selectPackages(collectProfilePackages(profile), mode);
console.log(toTurboFilters(packages));
