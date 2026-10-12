import { type Registry, resolveProfile } from "@g2-composition/registry";
import { mkdir, readdir } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { parse as parseYaml } from "yaml";

import { validateSourceProfile } from "./validate-source-profile";

/** monorepo 根目录（src/cli.ts 相对位置固定，不依赖调用方 cwd，兼容 `bun run --filter` 会把 cwd 切到包目录的行为）。 */
const workspaceRoot = join(import.meta.dir, "../../..");

function resolveFromWorkspaceRoot(path: string): string {
  return isAbsolute(path) ? path : join(workspaceRoot, path);
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      flags[arg.slice(2)] = args[i + 1];
      i += 1;
    }
  }
  return flags;
}

async function runResolve(args: string[]): Promise<void> {
  const flags = parseFlags(args);
  if (!flags.profile || !flags.registry || !flags.out) {
    console.error("usage: resolve --profile <path> --registry <path> --out <path>");
    process.exit(1);
  }
  const profilePath = resolveFromWorkspaceRoot(flags.profile);
  const registryPath = resolveFromWorkspaceRoot(flags.registry);
  const outPath = resolveFromWorkspaceRoot(flags.out);

  const profileText = await Bun.file(profilePath).text();
  const profileResult = validateSourceProfile(profileText);
  if (!profileResult.ok) {
    console.error(`FAIL ${flags.profile}`);
    for (const error of profileResult.errors) {
      console.error(`  - ${error}`);
    }
    process.exit(1);
  }

  const registryText = await Bun.file(registryPath).text();
  const registry = parseYaml(registryText) as Registry;

  const resolved = resolveProfile(profileResult.profile, registry);

  await mkdir(dirname(outPath), { recursive: true });
  await Bun.write(outPath, `${JSON.stringify(resolved, null, 2)}\n`);
  console.log(`OK  wrote resolved profile to ${flags.out}`);
}

async function runValidate(rootArg: string | undefined): Promise<void> {
  const root = rootArg ?? join(import.meta.dir, "../../../deploy/compositions");

  const entries = await readdir(root);
  const files = entries.filter((name) => name.endsWith(".yaml") || name.endsWith(".yml"));

  if (files.length === 0) {
    console.error(`no composition yaml found in ${root}`);
    process.exit(1);
  }

  let failed = 0;
  for (const file of files) {
    const path = join(root, file);
    const text = await Bun.file(path).text();
    const result = validateSourceProfile(text);
    if (result.ok) {
      console.log(`OK  ${file}`);
    } else {
      failed += 1;
      console.error(`FAIL ${file}`);
      for (const error of result.errors) {
        console.error(`  - ${error}`);
      }
    }
  }

  process.exit(failed === 0 ? 0 : 1);
}

const [command, ...rest] = process.argv.slice(2);

if (command === "resolve") {
  await runResolve(rest);
} else {
  await runValidate(command);
}
