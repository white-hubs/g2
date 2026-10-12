import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import * as ts from "typescript";

import { validateSourceProfile } from "../../../packages/composition-schema/src/validate-source-profile";
import { findRuntimeCommonFallbacks } from "./check";

type ProfileMember = { logicalName: string };
type PackageMember = { logicalName: string; package: string };
type DependencyManifest = {
  consumers: Record<string, string[]>;
  providers: Record<string, string[]>;
  platformProviders: Record<string, string[]>;
};

const repoRoot = path.resolve(import.meta.dirname, "../../..");

function sourceRoot(packageName: string): string | undefined {
  const match = packageName.match(/^@g2-(domain|pages|platform)\/(.+)$/);
  if (!match) return undefined;
  const folder = { domain: "domains", pages: "page-libraries", platform: "platforms" }[match[1] as "domain" | "pages" | "platform"];
  return path.join(repoRoot, "apps", folder, match[2], "src");
}

function sourceFiles(directory: string): string[] {
  const result: string[] = [];
  for (const name of readdirSync(directory)) {
    const file = path.join(directory, name);
    const stat = statSync(file);
    if (stat.isDirectory()) {
      if (!new Set(["__tests__", "dist", "node_modules", "vendor"]).has(name)) result.push(...sourceFiles(file));
    } else if (/\.(?:ts|tsx|vue)$/.test(name) && !/\.(?:test|spec)\./.test(name)) {
      result.push(file);
    }
  }
  return result;
}

export function findLoadedRuntimeNames(source: string): Set<string> {
  const names = new Set<string>();
  const callPatterns = [
    /\b(?:loadPlatform|loadRuntimeCommon)\s*(?:<[^>]*>)?\s*\(\s*["']([A-Za-z0-9]+)["']/g,
    /\bdefineAsyncRuntimeCommonComponent(?:<[^>]*>)?\s*\(\s*loadRuntimeCommon\s*,\s*["']([A-Za-z0-9]+)["']/g,
    /\bloadCharts\s*\(\s*["']([A-Za-z0-9]+)["']/g,
  ];
  for (const pattern of callPatterns) {
    for (const match of source.matchAll(pattern)) names.add(match[1]);
  }
  const platformArrays = /for\s*\(\s*const\s+platform\s+of\s*\[([\s\S]*?)\]\s*as\s+const\s*\)/g;
  for (const match of source.matchAll(platformArrays)) {
    for (const name of match[1].matchAll(/["']([A-Za-z0-9]+)["']/g)) names.add(name[1]);
  }
  return names;
}

export function findStaticRuntimeCommonImports(source: string, runtimePackages: ReadonlySet<string>): string[] {
  const sourceFile = ts.createSourceFile("runtime-common-consumer.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = new Set<string>();
  const isRuntimePackage = (specifier: string): boolean =>
    [...runtimePackages].some((packageName) => specifier === packageName || specifier.startsWith(`${packageName}/`));

  const inspectModule = (moduleSpecifier: ts.Expression, isRuntimeDependency: boolean): void => {
    if (isRuntimeDependency && ts.isStringLiteralLike(moduleSpecifier) && isRuntimePackage(moduleSpecifier.text)) {
      found.add(moduleSpecifier.text);
    }
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const runtimeBinding =
        !clause ||
        (!clause.isTypeOnly &&
          (Boolean(clause.name) ||
            (bindings !== undefined &&
              (ts.isNamespaceImport(bindings) ||
                (ts.isNamedImports(bindings) &&
                  (bindings.elements.length === 0 || bindings.elements.some((element) => !element.isTypeOnly)))))));
      inspectModule(node.moduleSpecifier, runtimeBinding);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const runtimeExport =
        !node.isTypeOnly &&
        (!node.exportClause ||
          !ts.isNamedExports(node.exportClause) ||
          node.exportClause.elements.length === 0 ||
          node.exportClause.elements.some((element) => !element.isTypeOnly));
      inspectModule(node.moduleSpecifier, runtimeExport);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length > 0) {
      inspectModule(node.arguments[0], true);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return [...found].toSorted();
}

function hasRuntimeCommonProxyAlias(packageName: string, runtimePackage: string): boolean {
  const directory = sourceRoot(packageName);
  if (!directory) return false;
  const configPath = path.join(path.dirname(directory), "vite.config.ts");
  if (!existsSync(configPath)) return false;
  const source = readFileSync(configPath, "utf8");
  const sourceFile = ts.createSourceFile(configPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const expectedPattern = `^${runtimePackage.replaceAll("/", "\\/")}$`;
  let found = false;

  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const properties = node.properties.filter(ts.isPropertyAssignment);
      const find = properties.find((property) => property.name.getText(sourceFile) === "find");
      const replacement = properties.find((property) => property.name.getText(sourceFile) === "replacement");
      if (find && replacement && ts.isRegularExpressionLiteral(find.initializer)) {
        const pattern = find.initializer.text.slice(1, find.initializer.text.lastIndexOf("/"));
        const target = replacement.initializer.getText(sourceFile);
        if (pattern === expectedPattern && /(?:runtime|\.\/src\/[^"']+-runtime\.)/i.test(target)) found = true;
      }

      const directAlias = properties.find((property) => property.name.getText(sourceFile).replaceAll(/["']/g, "") === runtimePackage);
      if (directAlias && /(?:runtime|\.\/src\/[^"']+-runtime\.)/i.test(directAlias.initializer.getText(sourceFile))) found = true;
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return found;
}

function collectDependencies(packageName: string): Set<string> {
  const directory = sourceRoot(packageName);
  if (!directory || !existsSync(directory)) {
    throw new Error(`missing source directory for ${packageName}`);
  }
  const names = new Set<string>();
  for (const file of sourceFiles(directory)) {
    const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, "$1");
    for (const name of findLoadedRuntimeNames(source)) names.add(name);
  }
  return names;
}

function sorted(values: Iterable<string>): string[] {
  return [...values].toSorted((left, right) => left.localeCompare(right));
}

export function runChangedRuntimeCommonCheck(baseRef: string): string[] {
  const changedFiles = execFileSync("git", ["diff", "--name-only", `${baseRef}...HEAD`], {
    cwd: repoRoot,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const sourceProfile = validateSourceProfile(readFileSync(path.join(repoRoot, "deploy/compositions/prod.pc.yaml"), "utf8"));
  if (!sourceProfile.ok) return sourceProfile.errors;
  const releaseText = readFileSync(path.join(repoRoot, "deploy/release-sets/prod.yaml"), "utf8");
  const releaseMembers = [...releaseText.matchAll(/^\s*- logicalName:\s*([A-Za-z0-9]+)\s*\n\s+package:\s*["']([^"']+)["']/gm)].map(
    (match) => ({ logicalName: match[1]!, package: match[2]! }),
  );
  const releaseByLogicalName = new Map(releaseMembers.map((member) => [member.logicalName, member.package]));
  const manifest = JSON.parse(
    readFileSync(path.join(repoRoot, "deploy/runtime-common-dependencies.prod.json"), "utf8"),
  ) as DependencyManifest;
  const composition = sourceProfile.profile;
  const consumers = [...composition.remotes, ...composition.pageLibrary];
  const providers = new Set([...(composition.coreRuntime ?? []), ...(composition.platform ?? [])].map((member) => member.logicalName));
  const runtimePackages = new Set(
    [...providers].flatMap((name) => {
      const packageName = releaseByLogicalName.get(name);
      return packageName ? [packageName] : [];
    }),
  );
  const errors: string[] = [];

  for (const consumer of consumers) {
    const packageName = releaseByLogicalName.get(consumer.logicalName);
    if (!packageName) continue;
    const directory = sourceRoot(packageName);
    if (!directory) continue;
    const packageDirectory = path.dirname(directory);
    const relativeDirectory = path.relative(repoRoot, packageDirectory).replaceAll(path.sep, "/");
    if (!changedFiles.some((file) => file.startsWith(relativeDirectory + "/"))) continue;

    if (!Object.hasOwn(manifest.consumers, consumer.logicalName)) {
      errors.push(`${consumer.logicalName} is missing its Runtime Common consumer matrix entry`);
    }
    const declared = manifest.consumers[consumer.logicalName] ?? [];
    const discovered = collectDependencies(packageName);
    for (const dependency of discovered) {
      if (!declared.includes(dependency)) errors.push(`${consumer.logicalName} is missing declared runtime dependency ${dependency}`);
    }
    for (const dependency of declared) {
      if (!discovered.has(dependency)) errors.push(`${consumer.logicalName} declares unused runtime dependency ${dependency}`);
    }

    for (const file of sourceFiles(directory)) {
      for (const specifier of findStaticRuntimeCommonImports(readFileSync(file, "utf8"), runtimePackages)) {
        if (!hasRuntimeCommonProxyAlias(packageName, specifier.split("/").slice(0, 3).join("/"))) {
          errors.push(`${consumer.logicalName} has static runtime import ${specifier} in ${path.relative(repoRoot, file)}`);
        }
      }
    }

    const packageJsonPath = path.join(packageDirectory, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    for (const runtimePackage of runtimePackages) {
      if (packageJson.dependencies?.[runtimePackage] && !packageJson.devDependencies?.[runtimePackage]) {
        errors.push(`${consumer.logicalName} must keep ${runtimePackage} out of production dependencies`);
      }
    }

    const viteConfig = path.join(packageDirectory, "vite.config.ts");
    if (existsSync(viteConfig)) {
      const config = readFileSync(viteConfig, "utf8");
      for (const runtimePackage of runtimePackages) {
        if (new RegExp("[\"']" + runtimePackage + "[\"']\\s*:").test(config)) {
          errors.push(`${consumer.logicalName} must not Federation-share Runtime Common package ${runtimePackage}`);
        }
      }
    }
  }

  return errors;
}

export function validateRuntimeCommonMatrix(
  composition: { coreRuntime?: ProfileMember[]; platform?: ProfileMember[]; remotes?: ProfileMember[]; pageLibrary?: ProfileMember[] },
  releaseMembers: PackageMember[],
  manifest: DependencyManifest,
): string[] {
  const errors: string[] = [];
  const providerNames = (composition.coreRuntime ?? []).map((member) => member.logicalName);
  const providerSet = new Set(providerNames);
  const platformNames = (composition.platform ?? []).map((member) => member.logicalName).filter((name) => !providerSet.has(name));
  const platformSet = new Set(platformNames);
  const allProviderSet = new Set([...providerNames, ...platformNames]);
  const releaseByLogicalName = new Map(releaseMembers.map((member) => [member.logicalName, member.package]));
  const runtimePackages = new Set(
    [...allProviderSet].flatMap((name) => {
      const packageName = releaseByLogicalName.get(name);
      return packageName ? [packageName] : [];
    }),
  );
  const productionConsumers = [...(composition.remotes ?? []), ...(composition.pageLibrary ?? [])].map((member) => member.logicalName);
  const productionConsumerSet = new Set(productionConsumers);

  for (const name of productionConsumers) {
    if (!Object.hasOwn(manifest.consumers, name)) errors.push(`missing consumer matrix entry: ${name}`);
  }
  for (const name of Object.keys(manifest.consumers)) {
    if (!productionConsumerSet.has(name)) errors.push(`consumer is not in production composition: ${name}`);
  }
  for (const name of providerNames) {
    if (!Object.hasOwn(manifest.providers, name)) errors.push(`missing provider matrix entry: ${name}`);
  }
  for (const name of Object.keys(manifest.providers)) {
    if (!providerSet.has(name)) errors.push(`provider is not in coreRuntime: ${name}`);
  }
  for (const name of platformNames) {
    if (!Object.hasOwn(manifest.platformProviders, name)) errors.push(`missing platform dependency matrix entry: ${name}`);
  }
  for (const name of Object.keys(manifest.platformProviders)) {
    if (!platformSet.has(name)) errors.push(`platform dependency entry is not a non-core platform: ${name}`);
  }

  for (const [name, dependencies] of Object.entries(manifest.providers)) {
    const providerIndex = providerNames.indexOf(name);
    for (const dependency of dependencies) {
      if (!providerSet.has(dependency)) errors.push(`${name} depends on unregistered coreRuntime provider ${dependency}`);
      else if (providerNames.indexOf(dependency) >= providerIndex) errors.push(`${dependency} must be registered before provider ${name}`);
    }
    const pkg = releaseByLogicalName.get(name);
    if (!pkg) {
      errors.push(`missing release package for coreRuntime provider ${name}`);
      continue;
    }
    try {
      const discovered = collectDependencies(pkg);
      for (const dependency of discovered) {
        if (!dependencies.includes(dependency)) errors.push(`${name} provider is missing declared runtime dependency ${dependency}`);
      }
      for (const dependency of dependencies) {
        if (!discovered.has(dependency)) errors.push(`${name} provider declares unused runtime dependency ${dependency}`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  for (const [name, dependencies] of Object.entries(manifest.platformProviders)) {
    const platformIndex = platformNames.indexOf(name);
    for (const dependency of dependencies) {
      if (!allProviderSet.has(dependency)) errors.push(`${name} depends on unregistered platform ${dependency}`);
      else if (platformSet.has(dependency) && platformNames.indexOf(dependency) >= platformIndex) {
        errors.push(`${dependency} must be registered before platform ${name}`);
      }
    }
    const pkg = releaseByLogicalName.get(name);
    if (!pkg) {
      errors.push(`missing release package for platform ${name}`);
      continue;
    }
    try {
      const discovered = collectDependencies(pkg);
      for (const dependency of discovered) {
        if (!dependencies.includes(dependency)) errors.push(`${name} platform is missing declared runtime dependency ${dependency}`);
      }
      for (const dependency of dependencies) {
        if (!discovered.has(dependency)) errors.push(`${name} platform declares unused runtime dependency ${dependency}`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  for (const name of productionConsumers) {
    const pkg = releaseByLogicalName.get(name);
    if (!pkg) {
      errors.push(`missing release package for consumer ${name}`);
      continue;
    }
    const declared = manifest.consumers[name] ?? [];
    if (new Set(declared).size !== declared.length) errors.push(`${name} has duplicate runtime dependencies`);
    for (const dependency of declared) {
      if (!allProviderSet.has(dependency)) errors.push(`${name} depends on unregistered provider ${dependency}`);
    }
    try {
      const directory = sourceRoot(pkg);
      if (directory && existsSync(directory)) {
        for (const file of sourceFiles(directory)) {
          const source = readFileSync(file, "utf8");
          for (const specifier of findStaticRuntimeCommonImports(source, runtimePackages)) {
            if (hasRuntimeCommonProxyAlias(pkg, specifier.split("/").slice(0, 3).join("/"))) continue;
            errors.push(`${name} has static runtime import ${specifier} in ${path.relative(repoRoot, file)}`);
          }
        }
      }
      const discovered = collectDependencies(pkg);
      for (const dependency of discovered) {
        if (!declared.includes(dependency)) errors.push(`${name} is missing declared runtime dependency ${dependency}`);
      }
      for (const dependency of declared) {
        if (!discovered.has(dependency)) errors.push(`${name} declares unused runtime dependency ${dependency}`);
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return errors;
}

export function runRuntimeCommonMatrixCheck(): string[] {
  const sourceProfile = validateSourceProfile(readFileSync(path.join(repoRoot, "deploy/compositions/prod.pc.yaml"), "utf8"));
  if (!sourceProfile.ok) throw new Error(sourceProfile.errors.join("\n"));
  const releaseText = readFileSync(path.join(repoRoot, "deploy/release-sets/prod.yaml"), "utf8");
  const releaseMembers = [...releaseText.matchAll(/^\s*- logicalName:\s*([A-Za-z0-9]+)\s*\n\s+package:\s*["']([^"']+)["']/gm)].map(
    (match) => ({
      logicalName: match[1],
      package: match[2],
    }),
  );
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, "deploy/runtime-common-dependencies.prod.json"), "utf8"));
  const composition = sourceProfile.profile;
  const errors = validateRuntimeCommonMatrix(composition, releaseMembers, manifest);
  if (errors.length === 0) {
    console.info(
      `Runtime dependency matrix passed (${composition.remotes.length} remotes, ${composition.pageLibrary.length} page libraries, ${composition.coreRuntime.length} Core Runtime providers).`,
    );
    console.info(`Core Runtime: ${sorted(Object.keys(manifest.providers)).join(", ")}`);
  }
  return errors;
}

export async function runRuntimeCommonArtifactProfileCheck(): Promise<string[]> {
  const sourceProfile = validateSourceProfile(readFileSync(path.join(repoRoot, "deploy/compositions/prod.pc.yaml"), "utf8"));
  if (!sourceProfile.ok) return sourceProfile.errors;

  const releaseText = readFileSync(path.join(repoRoot, "deploy/release-sets/prod.yaml"), "utf8");
  const releaseMembers = [...releaseText.matchAll(/^\s*- logicalName:\s*([A-Za-z0-9]+)\s*\n\s+package:\s*["']([^"']+)["']/gm)].map(
    (match) => ({ logicalName: match[1]!, package: match[2]! }),
  );
  const releaseByLogicalName = new Map(releaseMembers.map((member) => [member.logicalName, member.package]));
  const composition = sourceProfile.profile;
  const providerNames = [...(composition.coreRuntime ?? []), ...(composition.platform ?? [])].map((member) => member.logicalName);
  const runtimePackages = [
    ...new Set(
      providerNames.flatMap((name) => {
        const packageName = releaseByLogicalName.get(name);
        return packageName ? [packageName] : [];
      }),
    ),
  ];
  if (runtimePackages.length === 0) return ["production profile has no Runtime Common provider packages to scan"];

  const errors: string[] = [];
  const consumers = [...composition.remotes, ...(composition.pageLibrary ?? [])];
  for (const consumer of consumers) {
    const packageName = releaseByLogicalName.get(consumer.logicalName);
    const sourceDirectory = packageName ? sourceRoot(packageName) : undefined;
    if (!packageName || !sourceDirectory) {
      errors.push(`${consumer.logicalName} has no supported production package mapping for artifact scan`);
      continue;
    }

    const distDirectory = path.join(path.dirname(sourceDirectory), "dist");
    if (!existsSync(distDirectory)) {
      errors.push(`${consumer.logicalName} artifact directory is missing: ${path.relative(repoRoot, distDirectory)}`);
      continue;
    }

    let jsFiles = 0;
    const glob = new Bun.Glob("**/*.js");
    for await (const file of glob.scan({ cwd: distDirectory, onlyFiles: true })) {
      jsFiles += 1;
      const contents = readFileSync(path.join(distDirectory, file), "utf8");
      for (const violation of findRuntimeCommonFallbacks(file, contents, runtimePackages)) {
        errors.push(`${consumer.logicalName} artifact ${violation.file} contains local fallback for ${violation.packageName}`);
      }
    }
    if (jsFiles === 0)
      errors.push(`${consumer.logicalName} artifact directory contains no JavaScript: ${path.relative(repoRoot, distDirectory)}`);
  }

  if (errors.length === 0) {
    console.info(`Runtime Common artifact profile passed (${consumers.length} production consumers scanned).`);
  }
  return errors;
}
