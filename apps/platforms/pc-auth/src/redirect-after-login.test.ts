import { describe, expect, test } from "bun:test";
import { type Router, createMemoryHistory, createRouter } from "vue-router";

import { isGranaryPortalFullWindowPath, redirectAfterLogin, searchParamsImplyFullWindow } from "./redirect-after-login";

/**
 * 用真实的 `vue-router` `Router` 实例（内存历史，不依赖 DOM/浏览器 API）而不是手写一个形状相似的
 * 假对象——`redirectAfterLogin` 的类型签名直接约束参数是 `Router`，用真实实例能顺带验证
 * `router.replace()` 的调用方式（`RouteLocationRaw` 形状）是 `vue-router` 真的能接受的，
 * 不是我们自己猜的一个凑巧编译通过的形状。
 */
function createTestRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", name: "catch-all", component: { render: () => null } }],
  });
}

/** `router.replace()` 内部的导航守卫走 Promise 微任务链，不是真的用了计时器——用一个 0ms 的
 * 宏任务把微任务队列排空即可等到导航落地，不需要引入额外的测试专用等待 API。 */
function flushRouterNavigation(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("redirectAfterLogin", () => {
  test("空字符串什么都不做", () => {
    const router = createTestRouter();
    const assignLocation = () => {
      throw new Error("should not be called");
    };
    expect(() => redirectAfterLogin("", router, assignLocation)).not.toThrow();
  });

  test("普通站内路径（不以 / 开头）会被补全前导 / 后用 router.replace 跳转", async () => {
    const router = createTestRouter();
    redirectAfterLogin("index", router);
    await flushRouterNavigation();
    expect(router.currentRoute.value.path).toBe("/index");
  });

  test("普通站内路径（已带前导 /）直接用 router.replace 跳转", async () => {
    const router = createTestRouter();
    redirectAfterLogin("/workbench", router);
    await flushRouterNavigation();
    expect(router.currentRoute.value.path).toBe("/workbench");
  });

  test("非粮仓全屏路径不会被自动加上 isFullWindow 参数", async () => {
    const router = createTestRouter();
    redirectAfterLogin("/index", router);
    await flushRouterNavigation();
    expect(router.currentRoute.value.query.isFullWindow).toBeUndefined();
  });

  test("粮仓全屏路径（如 granary-platform-hub）自动补 isFullWindow=1", async () => {
    const router = createTestRouter();
    redirectAfterLogin("/portal/granary-management/granary-platform-hub", router);
    await flushRouterNavigation();
    expect(router.currentRoute.value.query.isFullWindow).toBe("1");
  });

  test("粮仓全屏路径已经带 isFullWindow=1 时不重复添加/不出错", async () => {
    const router = createTestRouter();
    redirectAfterLogin("/portal/granary-management/granary-platform-hub?isFullWindow=1", router);
    await flushRouterNavigation();
    expect(router.currentRoute.value.query.isFullWindow).toBe("1");
  });

  test("完整 http(s) URL 走 assignLocation（跨端口场景），不调用 router.replace", () => {
    const router = createTestRouter();
    let assignedTo = "";
    redirectAfterLogin("https://example.com/portal/granary-management/statistical-panel", router, (url) => {
      assignedTo = url;
    });
    expect(assignedTo).toBe("https://example.com/portal/granary-management/statistical-panel?isFullWindow=1");
    expect(router.currentRoute.value.path).toBe("/");
  });

  test("完整 http(s) URL 非粮仓全屏路径时原样跳转，不追加参数", () => {
    const router = createTestRouter();
    let assignedTo = "";
    redirectAfterLogin("https://example.com/index", router, (url) => {
      assignedTo = url;
    });
    expect(assignedTo).toBe("https://example.com/index");
  });
});

describe("isGranaryPortalFullWindowPath", () => {
  test("命中三种粮仓全屏路径规则", () => {
    expect(isGranaryPortalFullWindowPath("/portal/granary-management/main-management/warehouse-detail")).toBe(true);
    expect(isGranaryPortalFullWindowPath("/portal/granary-management/xxx/statistical-panel")).toBe(true);
    expect(isGranaryPortalFullWindowPath("/portal/granary-management/granary-platform-hub")).toBe(true);
  });

  test("不属于 portal/granary-management 前缀的路径一律 false", () => {
    expect(isGranaryPortalFullWindowPath("/portal/other/statistical-panel")).toBe(false);
    expect(isGranaryPortalFullWindowPath("/index")).toBe(false);
  });
});

describe("searchParamsImplyFullWindow", () => {
  test("isFullWindow=1 或 'true' 视为已声明全屏", () => {
    expect(searchParamsImplyFullWindow(new URLSearchParams("isFullWindow=1"))).toBe(true);
    expect(searchParamsImplyFullWindow(new URLSearchParams("isFullWindow=true"))).toBe(true);
  });

  test("没有该参数或值不匹配时视为未声明", () => {
    expect(searchParamsImplyFullWindow(new URLSearchParams(""))).toBe(false);
    expect(searchParamsImplyFullWindow(new URLSearchParams("isFullWindow=0"))).toBe(false);
  });
});
