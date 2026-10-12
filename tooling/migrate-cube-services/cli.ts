#!/usr/bin/env bun
/**
 * One-shot migrator: ghcloud cube-services → g2 contracts + bff (+ optional client scaffolds).
 * Idempotent enough to re-run; skips overwriting dual-track shell client files unless --force.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = join(import.meta.dir, "../..");
const OLD = process.env.OLD_CUBE_SERVICES ?? "/Users/dg/work-ghy/ghcloud/prod/cube-services";

const INTERFACE_SURFACES = readdirSync(join(OLD, "interfaces/src")).filter((n) => statSync(join(OLD, "interfaces/src", n)).isDirectory());

function rewriteInterfaceImports(src: string): string {
  return src
    .replaceAll("@ghcloud/cube-service-interface/", "@g2-contract/")
    .replaceAll("'@ghcloud/cube-service-interface/", "'@g2-contract/")
    .replaceAll('"@ghcloud/cube-service-interface/', '"@g2-contract/');
}

function rewriteBffImports(src: string): string {
  return rewriteInterfaceImports(src)
    .replaceAll("@ghcloud/cube-gateway-server", "@g2-server/bff")
    .replaceAll("from '@/", "from '@/")
    .replaceAll('from "@/', 'from "@/');
}

function ensureContractPackage(surface: string, files: Map<string, string>) {
  const dir = join(ROOT, "contracts", surface);
  mkdirSync(join(dir, "src"), { recursive: true });
  for (const [rel, content] of files) {
    const dest = join(dir, "src", rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, content);
  }
  // Prefer main.ts as package entry when present
  const entry = files.has("main.ts") ? "./src/main.ts" : "./src/index.ts";
  if (!files.has("main.ts") && !files.has("index.ts")) {
    const first = [...files.keys()][0];
    writeFileSync(join(dir, "src/index.ts"), `export * from "./${first!.replace(/\.ts$/, "")}";\n`);
  }
  writeFileSync(
    join(dir, "package.json"),
    `${JSON.stringify(
      {
        name: `@g2-contract/${surface}`,
        version: "0.0.0",
        private: true,
        type: "module",
        exports: { ".": entry },
        scripts: {
          typecheck: "tsc -p tsconfig.json --noEmit",
          test: "bun test",
        },
        devDependencies: { typescript: "catalog:typescript" },
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(dir, "tsconfig.json"),
    `${JSON.stringify({ extends: "../../tsconfig.base.json", include: ["src/**/*.ts"] }, null, 2)}\n`,
  );
}

function migrateInterfaces() {
  for (const surface of INTERFACE_SURFACES) {
    const srcDir = join(OLD, "interfaces/src", surface);
    const files = new Map<string, string>();
    const walk = (dir: string, prefix = "") => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p, join(prefix, name));
        else if (name.endsWith(".ts")) {
          files.set(join(prefix, name).replaceAll("\\", "/"), rewriteInterfaceImports(readFileSync(p, "utf8")));
        }
      }
    };
    walk(srcDir);

    // Existing dual-track packages: merge gateway types alongside shell client types
    if (surface === "auth" || surface === "ouaa") {
      const dir = join(ROOT, "contracts", surface, "src");
      mkdirSync(dir, { recursive: true });
      for (const [rel, content] of files) {
        writeFileSync(join(dir, rel === "main.ts" ? "gateway-surface.ts" : rel), content);
      }
      // keep existing index.ts; append re-exports if missing
      const indexPath = join(dir, "index.ts");
      let index = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
      if (!index.includes("gateway-surface")) {
        index += `\n\n/** cube-services Gateway / DTO（与壳侧 /api 双轨并存；TODO(dual-track) 收敛） */\nexport * from "./gateway-surface";\n`;
        writeFileSync(indexPath, index);
      }
      continue;
    }

    ensureContractPackage(surface, files);
  }
  console.log(`contracts: migrated ${INTERFACE_SURFACES.length} surfaces`);
}

function migrateBffSrc() {
  const destSrc = join(ROOT, "bff/src");
  // Preserve create-app + tests we own
  const keep = new Set(["create-app.ts", "health.integration.test.ts", "auth.token.integration.test.ts"]);
  if (existsSync(destSrc)) {
    for (const name of readdirSync(destSrc)) {
      if (keep.has(name)) continue;
      rmSync(join(destSrc, name), { recursive: true, force: true });
    }
  }
  mkdirSync(destSrc, { recursive: true });
  cpSync(join(OLD, "gateway/src"), destSrc, { recursive: true });

  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".ts")) {
        let text = readFileSync(p, "utf8");
        text = rewriteBffImports(text);
        text = text.replaceAll("@ghcloud/cube-gateway-server", "@g2-server/bff");
        // package root finder
        text = text.replaceAll('"@ghcloud/cube-gateway-server"', '"@g2-server/bff"');
        text = text.replaceAll("'@ghcloud/cube-gateway-server'", "'@g2-server/bff'");
        writeFileSync(p, text);
      }
    }
  };
  walk(destSrc);

  // Fix config package name constant
  const configPath = join(destSrc, "config/app.config.ts");
  if (existsSync(configPath)) {
    let cfg = readFileSync(configPath, "utf8");
    cfg = cfg.replaceAll("@ghcloud/cube-gateway-server", "@g2-server/bff");
    writeFileSync(configPath, cfg);
  }

  // Fix health service string
  const healthPath = join(destSrc, "controllers/health.controller.ts");
  if (existsSync(healthPath)) {
    let h = readFileSync(healthPath, "utf8");
    h = h.replaceAll("@ghcloud/cube-gateway-server", "@g2-server/bff");
    writeFileSync(healthPath, h);
  }

  // Fix main.ts app name
  const mainPath = join(destSrc, "main.ts");
  if (existsSync(mainPath)) {
    let m = readFileSync(mainPath, "utf8");
    m = m.replaceAll("@ghcloud/cube-gateway-server", "@g2-server/bff");
    writeFileSync(mainPath, m);
  }

  // Copy debug.ts
  cpSync(join(OLD, "gateway/debug.ts"), join(ROOT, "bff/debug.ts"));
  console.log("bff: copied gateway src");
}

function wireContractDepsOnBff() {
  const pkgPath = join(ROOT, "bff/package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    dependencies: Record<string, string>;
  };
  for (const surface of INTERFACE_SURFACES) {
    pkg.dependencies[`@g2-contract/${surface}`] = "workspace:*";
  }
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

const mode = Bun.argv[2] ?? "all";
if (mode === "interfaces" || mode === "all") migrateInterfaces();
if (mode === "bff" || mode === "all") {
  migrateBffSrc();
  wireContractDepsOnBff();
}
console.log("done", { OLD, ROOT: relative(process.cwd(), ROOT) || "." });
