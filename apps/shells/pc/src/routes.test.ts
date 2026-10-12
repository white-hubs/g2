import type { PlatformContext } from "@g2-composition/contract";
import { describe, expect, test } from "bun:test";

import { buildBaseRoutes } from "./routes";

function renderWrapper(component: unknown): { type: unknown; props: Record<string, unknown> } {
  const setup = (component as { setup: () => () => { type: unknown; props: Record<string, unknown> } }).setup;
  const render = setup();
  return render();
}

describe("buildBaseRoutes", () => {
  test("login 路由懒加载 auth.login slot，渲染时把 ctx/onLoginSuccess 当 props 传给它（不是只挂组件不传 props）", async () => {
    const fakeSlotComponent = { name: "FakeLoginSlot" };
    const ctx = {} as PlatformContext;
    const onLoginSuccess = () => undefined;
    let requestedSlot: string | undefined;

    const routes = buildBaseRoutes(
      async (slot) => {
        requestedSlot = slot;
        return fakeSlotComponent;
      },
      () => ({ ctx, onLoginSuccess }),
    );

    const loginRoute = routes.find((route) => route.name === "login")!;
    const WrapperComponent = await (loginRoute.component as () => Promise<unknown>)();
    expect(requestedSlot).toBe("auth.login");

    const vnode = renderWrapper(WrapperComponent);
    expect(vnode.type).toBe(fakeSlotComponent);
    expect(vnode.props).toMatchObject({ ctx, onLoginSuccess });
  });

  test("verifyAuth 路由只把 onLoginSuccess 传给 slot（该 slot 不需要 ctx）", async () => {
    const fakeSlotComponent = { name: "FakeVerifyAuthSlot" };
    const ctx = {} as PlatformContext;
    const onLoginSuccess = () => undefined;

    const routes = buildBaseRoutes(
      async () => fakeSlotComponent,
      () => ({ ctx, onLoginSuccess }),
    );

    const verifyAuthRoute = routes.find((route) => route.name === "verifyAuth")!;
    const WrapperComponent = await (verifyAuthRoute.component as () => Promise<unknown>)();
    const vnode = renderWrapper(WrapperComponent);
    expect(vnode.props).toEqual({ onLoginSuccess });
  });

  test("home 子路由含 index/about/workbench/portal/shell-placeholder", () => {
    const routes = buildBaseRoutes(
      async () => ({}),
      () => ({ ctx: {} as PlatformContext, onLoginSuccess: () => undefined }),
    );
    const homeRoute = routes.find((route) => route.name === "home")!;
    const childNames = (homeRoute.children ?? []).map((child) => child.name);
    expect(childNames).toEqual(["index", "about", "workbench", "portal", "shell-placeholder"]);
  });

  test("home 父路由使用空出口布局，不挂载 HomeView 占位文案；about 仍为 HomeView", () => {
    const routes = buildBaseRoutes(
      async () => ({}),
      () => ({ ctx: {} as PlatformContext, onLoginSuccess: () => undefined }),
    );
    const homeRoute = routes.find((route) => route.name === "home")!;
    const aboutRoute = (homeRoute.children ?? []).find((child) => child.name === "about")!;
    // 用 loader 源码断言装载目标，避免 bun:test 直接 import TSX 时缺 JSX runtime
    expect(String(homeRoute.component)).toContain("ShellOutletView");
    expect(String(homeRoute.component)).not.toContain("HomeView");
    expect(String(aboutRoute.component)).toContain("HomeView");
  });

  test("legacy compatibility keeps /index as the qiankun workbench route", () => {
    const routes = buildBaseRoutes(
      async () => ({}),
      () => ({ ctx: {} as PlatformContext, onLoginSuccess: () => undefined }),
      { useMfWorkbench: false },
    );
    const homeRoute = routes.find((route) => route.name === "home")!;
    const indexRoute = (homeRoute.children ?? []).find((child) => child.name === "index")!;
    const workbenchRoute = (homeRoute.children ?? []).find((child) => child.name === "workbench")!;
    expect(indexRoute.redirect).toBeUndefined();
    expect(workbenchRoute.redirect).toBe("/index");
  });
});
