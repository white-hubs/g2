import { findRuntimeCommonFallbacks } from "./check";
import { runChangedRuntimeCommonCheck, runRuntimeCommonArtifactProfileCheck, runRuntimeCommonMatrixCheck } from "./profile-check";
import { checkRuntimeRemote } from "./remote-check";

const [distDir, ...packageNames] = process.argv.slice(2);
if (distDir === "--remote") {
  const flags = new Map<string, string | true>();
  for (let index = 0; index < packageNames.length; index += 1) {
    const key = packageNames[index];
    if (!key?.startsWith("--")) continue;
    const separator = key.indexOf("=");
    if (separator > 0) {
      flags.set(key.slice(0, separator), key.slice(separator + 1));
      continue;
    }
    if (key === "--require-immutable") flags.set(key, true);
    else if (packageNames[index + 1] && !packageNames[index + 1]!.startsWith("--")) flags.set(key, packageNames[++index]!);
  }
  const manifestUrl = flags.get("--manifest");
  const origin = flags.get("--origin");
  if (typeof manifestUrl !== "string" || typeof origin !== "string") {
    console.error(
      "usage: runtime-common-check --remote --manifest=<manifest-url> --origin=<shell-origin> [--expect-runtime-version=<version>] [--expect-api-version=<range>] [--require-immutable]",
    );
    process.exitCode = 2;
  } else {
    try {
      const result = await checkRuntimeRemote({
        manifestUrl,
        origin,
        ...(typeof flags.get("--expect-runtime-version") === "string"
          ? { expectedRuntimeVersion: flags.get("--expect-runtime-version") as string }
          : {}),
        ...(typeof flags.get("--expect-api-version") === "string"
          ? { expectedApiVersion: flags.get("--expect-api-version") as string }
          : {}),
        requireImmutable: flags.get("--require-immutable") === true,
      });
      console.info(
        `Runtime Remote passed: ${result.runtimeVersion} (API ${result.apiVersion}); ${result.resourcesChecked} resources checked.`,
      );
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    }
  }
} else if (distDir === "--profile") {
  const errors = runRuntimeCommonMatrixCheck();
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  }
} else if (distDir === "--profile-artifacts") {
  const errors = await runRuntimeCommonArtifactProfileCheck();
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exitCode = 1;
  }
} else if (distDir?.startsWith("--changed-from=")) {
  const baseRef = distDir.slice("--changed-from=".length);
  if (!baseRef) {
    console.error("usage: runtime-common-check --changed-from=<git-ref>");
    process.exitCode = 2;
  } else {
    const errors = runChangedRuntimeCommonCheck(baseRef);
    if (errors.length > 0) {
      for (const error of errors) console.error(error);
      process.exitCode = 1;
    } else {
      console.info(`Runtime Common changed-consumer check passed (base ${baseRef}).`);
    }
  }
} else if (!distDir || packageNames.length === 0) {
  console.error(
    "usage: runtime-common-check <dist-dir> <package-name> [...package-name] | --profile | --profile-artifacts | --changed-from=<git-ref> | --remote --manifest=<url> --origin=<origin>",
  );
  process.exitCode = 2;
} else {
  const repoRoot = new URL("../../../", import.meta.url);
  const root = new URL(distDir.endsWith("/") ? distDir : `${distDir}/`, repoRoot);
  const glob = new Bun.Glob("**/*.js");
  const violations = [];
  for await (const file of glob.scan({ cwd: decodeURIComponent(root.pathname), onlyFiles: true })) {
    violations.push(...findRuntimeCommonFallbacks(file, await Bun.file(new URL(file, root)).text(), packageNames));
  }
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(`${violation.file}: local fallback for ${violation.packageName}`);
    }
    process.exitCode = 1;
  } else {
    console.info("runtime-common artifact check passed");
  }
}
