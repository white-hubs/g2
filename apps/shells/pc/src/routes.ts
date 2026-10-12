import type { PlatformContext } from "@g2-composition/contract";
import { defineComponent, h } from "vue";
import type { RouteRecordRaw } from "vue-router";

import type { AuthPersistenceLevel } from "./auth-session";

export interface AuthSlotDeps {
  ctx: PlatformContext;
  onLoginSuccess: (result: { token: string; tenant: string; refreshToken?: string; persistence?: AuthPersistenceLevel }) => void;
}

export interface BaseRouteOptions {
  useMfWorkbench?: boolean;
}

/**
 * Vue Router 的 `component` 选项不支持直接传自定义 props（如 `ctx`/`onLoginSuccess`），
 * 这里在 slot 组件外面包一层 wrapper component，在 render 时才读取 `getDeps()`，
 * 保证拿到的是 main.ts 里最新赋值的 ctx/onLoginSuccess（而不是路由表构建那一刻的旧值）。
 */
function wrapAuthSlot(
  loadSlot: () => Promise<unknown>,
  buildProps: (deps: AuthSlotDeps) => Record<string, unknown>,
  getDeps: () => AuthSlotDeps,
) {
  return async () => {
    const slotComponent = await loadSlot();
    return defineComponent({
      name: "AuthSlotRouteWrapper",
      setup() {
        return () => h(slotComponent as never, buildProps(getDeps()));
      },
    });
  };
}

export function buildBaseRoutes(
  loadAuthSlot: (slot: string) => Promise<unknown>,
  getAuthSlotDeps: () => AuthSlotDeps,
  options: BaseRouteOptions = {},
): RouteRecordRaw[] {
  const useMfWorkbench = options.useMfWorkbench ?? true;
  return [
    {
      path: "/login",
      name: "login",
      component: wrapAuthSlot(
        () => loadAuthSlot("auth.login"),
        (deps) => ({ ctx: deps.ctx, onLoginSuccess: deps.onLoginSuccess }),
        getAuthSlotDeps,
      ),
    },
    {
      path: "/verify-auth",
      name: "verifyAuth",
      component: wrapAuthSlot(
        () => loadAuthSlot("auth.verifyAuth"),
        (deps) => ({ onLoginSuccess: deps.onLoginSuccess }),
        getAuthSlotDeps,
      ),
    },
    {
      path: "/",
      name: "home",
      redirect: "/index",
      // 父路由只做 RouterView 出口，禁止挂 HomeView 文案以免叠在工作台/门户容器上。
      component: () => import("./ShellOutletView"),
      children: [
        // Legacy compatibility keeps /index for qiankun workbench; a resolved
        // native workbench Domain keeps the existing MF redirect.
        {
          path: "/index",
          name: "index",
          ...(useMfWorkbench ? { redirect: "/d/workbench" } : { component: () => import("./EmptyHostView") }),
        },
        { path: "/about", name: "about", component: () => import("./HomeView") },
        { path: "/workbench", name: "workbench", redirect: useMfWorkbench ? "/d/workbench/config" : "/index" },
        // 已迁应用不再兼容旧 `/portal/*`；未挂载微应用走空宿主。
        { path: "/portal:pathMatch(.*)", name: "portal", component: () => import("./EmptyHostView") },
        // OUAA/侧栏菜单路径（如 /ops/hazard-gov）在微应用未挂上前先落到空宿主，
        // 避免刷新深链或点击菜单时 Vue Router 报 No match found。
        { path: "/:pathMatch(.*)*", name: "shell-placeholder", component: () => import("./EmptyHostView") },
      ],
    },
  ];
}
