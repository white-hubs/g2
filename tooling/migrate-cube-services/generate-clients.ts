#!/usr/bin/env bun
/**
 * Generate @g2-client/<surface> from old cube-services *.client.ts.
 * Methods live inside createXClient(http) so `http` is bound.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "../..");
const OLD_CLIENT =
  process.env.OLD_CUBE_SERVICES != null
    ? join(process.env.OLD_CUBE_SERVICES, "client/src")
    : "/Users/dg/work-ghy/ghcloud/prod/cube-services/client/src";

const SKIP = new Set(["ouaa"]);
const PORT_START = 5025;

function toCamel(surface: string): string {
  return surface.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
function toPascal(surface: string): string {
  const c = toCamel(surface);
  return c.charAt(0).toUpperCase() + c.slice(1);
}
function logicalName(surface: string): string {
  return `${toCamel(surface)}Client`;
}

type Fn = { name: string; params: string; callExpr: string };

function extractConstAliases(src: string): Record<string, string> {
  const map: Record<string, string> = { BASE_API: "/api" };
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*["'`](\/[^"'`]+)["'`]/g)) {
    map[m[1]!] = m[2]!;
  }
  // const X = `${BASE_API}/foo` or `${API}/bar`
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*`\$\{(\w+)\}([^`]*)`/g)) {
    const base = map[m[2]!] ?? (m[2] === "BASE_API" ? "/api" : "");
    if (base) map[m[1]!] = `${base}${m[3]!}`;
  }
  return map;
}

function extractFns(src: string): Fn[] {
  const aliases = extractConstAliases(src);
  const fns: Fn[] = [];
  const re = /export const (\w+)\s*(?::[^=]+)?=\s*async\s*\(([^)]*)\)\s*(?::\s*[^=]+)?\s*=>/g;
  const hits: { name: string; params: string; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    hits.push({ name: m[1]!, params: m[2]!, start: m.index + m[0].length });
  }
  for (let i = 0; i < hits.length; i++) {
    const next = src.indexOf("\nexport const ", hits[i]!.start);
    const body = src.slice(hits[i]!.start, next === -1 ? src.length : next);
    const callExpr = transformBodyToHttpCall(body, aliases);
    if (callExpr) fns.push({ name: hits[i]!.name, params: hits[i]!.params, callExpr });
  }
  return fns;
}

function transformBodyToHttpCall(body: string, aliases: Record<string, string>): string | null {
  // makeList/GET/DELETE may omit .send when wrapped in json(makeListRequest(...))
  const patterns: [RegExp, string][] = [
    [/make(?:List|GET)Request\(\s*\{([\s\S]*?)\}\s*\)/, "get"],
    [/makeDELETERequest\(\s*\{([\s\S]*?)\}\s*\)/, "delete"],
    [/makeCreateRequest\(\s*\{([\s\S]*?)\}\s*\)/, "post"],
    [/makeUpdateRequest\(\s*\{([\s\S]*?)\}\s*\)/, "put"],
  ];
  for (const [re, method] of patterns) {
    const hit = body.match(re);
    if (!hit) continue;
    const inner = hit[1]!;
    const url = pickUrl(inner, aliases);
    const payload = pickPayload(inner);
    if (method === "get" || method === "delete") {
      return payload ? `http.${method}(withQuery(${url}, ${payload} as Record<string, unknown>))` : `http.${method}(${url})`;
    }
    return `http.${method}(${url}, ${payload ?? "undefined"})`;
  }
  const custom = body.match(/makeCustomRequest\(\s*\{([\s\S]*?)\}\s*\)/);
  if (custom) {
    const inner = custom[1]!;
    const method = (inner.match(/method:\s*['"](\w+)['"]/)?.[1] ?? "POST").toLowerCase();
    const url = pickUrl(inner, aliases);
    const payload = pickPayload(inner);
    if (method === "get" || method === "delete") {
      return payload ? `http.${method}(withQuery(${url}, ${payload} as Record<string, unknown>))` : `http.${method}(${url})`;
    }
    return `http.${method}(${url}${payload ? `, ${payload}` : ""})`;
  }
  return null;
}

function pickUrl(inner: string, aliases: Record<string, string>): string {
  const lit = inner.match(/url:\s*(`[^`]+`|"[^"]+"|'[^']+')/)?.[1];
  if (!lit) return '""';
  // Expand `${API}/x` → `/gw-bff/.../x`
  if (lit.startsWith("`")) {
    let t = lit.slice(1, -1);
    for (const [k, v] of Object.entries(aliases)) {
      t = t.replaceAll(`\${${k}}`, v);
    }
    // leftover ${id} keep as template
    return `\`${t}\``;
  }
  return lit;
}

function pickPayload(inner: string): string | undefined {
  // payload: { ...params } or payload: { ids }
  const m = inner.match(/payload:\s*(\{[\s\S]*?\})\s*(?:,|\n|$)/);
  return m?.[1];
}

/** Collapse param lists to `a?: unknown, b?: unknown` (drop defaults / inline types). */
function sanitizeParams(params: string, callExpr = ""): string {
  if (!params.trim()) return "";
  return params
    .split(",")
    .map((p) => {
      const name = p
        .trim()
        .replace(/\?.*$/, "")
        .replace(/\s*=.*$/, "")
        .replace(/:.*/, "")
        .trim();
      if (!name || !/^[\w$]+$/.test(name)) {
        return callExpr ? "_arg?: unknown" : "arg?: unknown";
      }
      const used = callExpr ? new RegExp(`\\b${name}\\b`).test(callExpr) : true;
      return `${used ? "" : "_"}${name}?: unknown`;
    })
    .join(", ");
}

function writePackage(surface: string, port: number, oldSrc: string) {
  const dir = join(ROOT, "apps/clients", surface);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(join(dir, "src"), { recursive: true });

  const pascal = toPascal(surface);
  const logical = logicalName(surface);
  const clientType = `${pascal}Client`;
  const fns = extractFns(oldSrc);
  if (!fns.length) {
    console.warn("no fns extracted", surface);
  }

  const clientTs = `// @ts-nocheck — generated client; tighten types in a follow-up
import type { PlatformContext } from "@g2-composition/contract";

function withQuery(url: string, payload?: Record<string, unknown>): string {
  if (!payload) return url;
  const entries = Object.entries(payload).filter(([, v]) => v !== undefined);
  if (!entries.length) return url;
  const qs = entries.map(([k, v]) => \`\${k}=\${encodeURIComponent(String(v))}\`).join("&");
  return url.includes("?") ? \`\${url}&\${qs}\` : \`\${url}?\${qs}\`;
}

interface HttpClient {
  get: (url: string) => Promise<unknown>;
  post: (url: string, body?: unknown) => Promise<unknown>;
  put: (url: string, body?: unknown) => Promise<unknown>;
  delete: (url: string) => Promise<unknown>;
}

interface HttpClientModule {
  createHttpClientForPlatform: (ctx: PlatformContext, baseUrl?: string) => HttpClient;
}

export type ${clientType} = {
${fns.map((f) => `  ${f.name}: (${sanitizeParams(f.params, f.callExpr)}) => Promise<unknown>;`).join("\n")}
};

export function create${pascal}Client(http: HttpClient): ${clientType} {
  return {
${fns
  .map((f) => {
    const params = sanitizeParams(f.params, f.callExpr);
    return `    ${f.name}: async (${params}) => ${f.callExpr},`;
  })
  .join("\n")}
  };
}

/** MF \`./client\` 入口：自持 http 编排（ADR-0057）。 */
export async function create(ctx: PlatformContext): Promise<${clientType}> {
  const httpModule = (await ctx.loadPlatform("httpPlatform", "client")) as HttpClientModule;
  return create${pascal}Client(httpModule.createHttpClientForPlatform(ctx));
}
`;

  writeFileSync(join(dir, "src/client.ts"), clientTs);

  const first = fns[0];
  const firstUrlMatch = first?.callExpr.match(/["'`](\/[^"'`?]+)/)?.[1] ?? oldSrc.match(/url:\s*[`'"](\/[^`'"]+)/)?.[1] ?? "/";

  writeFileSync(
    join(dir, "src/client.test.ts"),
    `import { expect, test } from "bun:test";
import { create${pascal}Client } from "./client";

test("@g2-client/${surface} ${first?.name ?? "api"} hits expected path", async () => {
  const urls: string[] = [];
  const http = {
    get: async (url: string) => { urls.push(url); return {}; },
    post: async (url: string) => { urls.push(url); return {}; },
    put: async (url: string) => { urls.push(url); return {}; },
    delete: async (url: string) => { urls.push(url); return {}; },
  };
  const api = create${pascal}Client(http);
  ${
    first
      ? `await (api.${first.name} as (...a: unknown[]) => Promise<unknown>)(${sanitizeParams(first.params)
          .split(",")
          .filter(Boolean)
          .map(() => '""')
          .join(", ")});`
      : ""
  }
  expect(urls.some((u) => u.includes(${JSON.stringify(firstUrlMatch.split("${")[0])}))).toBe(true);
});
`,
  );

  writeFileSync(
    join(dir, "src/main.ts"),
    `const el = document.querySelector("#app");\nif (el) el.textContent = "@g2-client/${surface}";\n`,
  );

  writeFileSync(
    join(dir, "index.html"),
    `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>@g2-client/${surface}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,
  );

  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify(
      {
        name: `@g2-client/${surface}`,
        version: "0.0.0",
        private: true,
        type: "module",
        exports: { "./client": "./src/client.ts" },
        scripts: {
          dev: `bun --bun vite --port ${port} --strictPort`,
          build: "bun --bun vite build",
          preview: `bun --bun vite preview --port ${port} --strictPort`,
          typecheck: "tsc -p tsconfig.json --noEmit",
          test: "bun test",
        },
        dependencies: {
          "@g2-composition/contract": "workspace:*",
          ...(existsSync(join(ROOT, "contracts", surface)) ? { [`@g2-contract/${surface}`]: "workspace:*" } : {}),
        },
        devDependencies: {
          "@g2-tooling/mf-vite": "workspace:*",
          typescript: "catalog:typescript",
          vite: "catalog:vite",
        },
      },
      null,
      2,
    ) + "\n",
  );

  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({ extends: "../../../tsconfig.base.json", include: ["src/**/*.ts"] }, null, 2) + "\n",
  );

  writeFileSync(
    join(dir, "vite.config.ts"),
    `import { federation } from "@g2-tooling/mf-vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: { host: true, port: ${port}, strictPort: true, origin: "http://localhost:${port}" },
  preview: { host: true, port: ${port}, strictPort: true },
  build: { target: "chrome89", modulePreload: false },
  plugins: [
    federation({
      name: "${logical}",
      filename: "remoteEntry.js",
      manifest: true,
      mfRuntime: { role: "remote" },
      exposes: { "./client": "./src/client.ts" },
      shared: {},
    }),
  ],
});
`,
  );

  // contract facade
  const contractDir = join(ROOT, "contracts", surface, "src");
  if (existsSync(contractDir)) {
    writeFileSync(
      join(contractDir, "client-facade.ts"),
      `export interface ${clientType} {\n${fns.map((f) => `  ${f.name}: (${f.params}) => Promise<unknown>;`).join("\n")}\n}\n`,
    );
    for (const idxName of ["main.ts", "index.ts"]) {
      const idx = join(contractDir, idxName);
      if (!existsSync(idx)) continue;
      let t = readFileSync(idx, "utf8");
      if (!t.includes("client-facade")) {
        writeFileSync(idx, `${t}\nexport type { ${clientType} } from "./client-facade";\n`);
      }
    }
  }

  return { surface, port, logical, methods: fns.length };
}

if (import.meta.main) {
  const files = readdirSync(OLD_CLIENT).filter((f) => f.endsWith(".client.ts"));
  let port = PORT_START;
  const created: { surface: string; port: number; logical: string; methods: number }[] = [];

  for (const file of files.toSorted()) {
    const surface = file.replace(/\.client\.ts$/, "");
    if (SKIP.has(surface)) continue;
    const src = readFileSync(join(OLD_CLIENT, file), "utf8");
    const info = writePackage(surface, port++, src);
    created.push(info);
    console.log(info);
  }

  console.log("regenerated", created.length, "clients");
}
