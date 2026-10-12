import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/** Collect `@Controller('...')` + HTTP method decorator paths from BFF/gateway controllers. */
export function extractControllerRoutes(controllersRoot: string): string[] {
  const routes = new Set<string>();
  const walk = (dir: string) => {
    if (!statSync(dir).isDirectory()) return;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
        const text = readFileSync(p, "utf8");
        const ctrl = text.match(/@Controller\(\s*['`]([^'`]+)['`]\s*\)/);
        const base = ctrl?.[1] ?? "";
        for (const m of text.matchAll(/@(GET|POST|PUT|PATCH|DELETE)\(\s*['`]([^'`]*)['`]\s*\)/g)) {
          const method = m[1]!;
          const sub = m[2] ?? "";
          const path = `${base}${sub.startsWith("/") || sub === "" ? sub : `/${sub}`}`.replace(/\/+/g, "/");
          routes.add(`${method} ${path || "/"}`);
        }
      }
    }
  };
  walk(controllersRoot);
  return [...routes].toSorted();
}

/** Collect URL string literals under /gw-bff from client sources. */
export function extractClientGwBffUrls(clientRoot: string): string[] {
  const urls = new Set<string>();
  const walk = (dir: string) => {
    if (!statSync(dir).isDirectory()) return;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name === "node_modules" || name === "dist") continue;
        walk(p);
      } else if ((name.endsWith(".ts") || name.endsWith(".tsx")) && !name.endsWith(".test.ts")) {
        const text = readFileSync(p, "utf8");
        for (const m of text.matchAll(/["'`](\/gw-bff\/[^"'`]+)["'`]/g)) {
          // strip template ${} tails to path prefix for static compare
          const raw = m[1]!.replace(/\$\{[^}]+\}/g, "*");
          const path = raw.split("?")[0]!;
          // skip doc placeholders like `/gw-bff/...`
          if (path.includes("...")) continue;
          urls.add(path);
        }
      }
    }
  };
  walk(clientRoot);
  return [...urls].toSorted();
}

export function diffSorted(expected: string[], actual: string[]): { missing: string[]; extra: string[] } {
  const exp = new Set(expected);
  const act = new Set(actual);
  return {
    missing: expected.filter((x) => !act.has(x)),
    extra: actual.filter((x) => !exp.has(x)),
  };
}
