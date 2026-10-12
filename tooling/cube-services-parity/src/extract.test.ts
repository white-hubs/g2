import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { diffSorted, extractClientGwBffUrls, extractControllerRoutes } from "./extract";

describe("cube-services parity extractors", () => {
  test("extractControllerRoutes 收集 Controller + 方法装饰器", () => {
    const dir = mkdtempSync(join(tmpdir(), "parity-ctrl-"));
    mkdirSync(join(dir, "auth"), { recursive: true });
    writeFileSync(
      join(dir, "auth/auth.controller.ts"),
      `
      @Controller('/gw-bff/auth')
      export class AuthController {
        @POST('/token')
        issueToken() {}
        @GET('/')
        root() {}
      }
      `,
    );
    expect(extractControllerRoutes(dir)).toEqual(["GET /gw-bff/auth/", "POST /gw-bff/auth/token"]);
  });

  test("extractClientGwBffUrls 收集字面量路径", () => {
    const dir = mkdtempSync(join(tmpdir(), "parity-cli-"));
    writeFileSync(join(dir, "x.client.ts"), `http.get("/gw-bff/ouaa/roles"); http.get(\`/gw-bff/ouaa/users/\${id}\`);`);
    expect(extractClientGwBffUrls(dir)).toEqual(["/gw-bff/ouaa/roles", "/gw-bff/ouaa/users/*"]);
  });

  test("diffSorted", () => {
    expect(diffSorted(["a", "b"], ["b", "c"])).toEqual({ missing: ["a"], extra: ["c"] });
  });
});
