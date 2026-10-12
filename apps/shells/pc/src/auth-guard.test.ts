import { describe, expect, test } from "bun:test";

import { createAuthGuard } from "./auth-guard";

describe("createAuthGuard", () => {
  test("白名单路由（login/verifyAuth）无条件放行", async () => {
    const guard = createAuthGuard({ getToken: () => undefined, whiteList: ["login", "verifyAuth"] });
    const next = (arg?: unknown) => arg;
    const result = await guard.call(undefined, { name: "login" } as never, {} as never, next as never);
    expect(result).toBeUndefined();
  });

  test("非白名单路由且无 token 时重定向到 login", async () => {
    const guard = createAuthGuard({ getToken: () => undefined, whiteList: ["login"] });
    let redirected: unknown;
    const next = (arg?: unknown) => {
      redirected = arg;
    };
    await guard.call(undefined, { name: "index" } as never, {} as never, next as never);
    expect(redirected).toMatchObject({ path: "/login", replace: true });
  });

  test("有 token 时放行", async () => {
    const guard = createAuthGuard({ getToken: () => "t", whiteList: ["login"] });
    let called = false;
    const next = () => {
      called = true;
    };
    await guard.call(undefined, { name: "index" } as never, {} as never, next as never);
    expect(called).toBe(true);
  });
});
