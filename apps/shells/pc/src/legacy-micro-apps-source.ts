import type { LegacyMicroAppConfig } from "./qiankun-bridge";

/**
 * 旧仓遗留 qiankun 微应用清单的真实来源。
 *
 * 依据 ADR-0031 与旧仓 `use-child-application.ts` 的实现，这份清单来自宿主运行时注入的
 * `window.config.microApps`（部署时按环境写入，不是构建期产物）。它和 Composition Profile
 * （`deploy/compositions/*.yaml`，描述的是原生 MF 域/Platform 的构建期静态编排）是两套完全不同生命周期
 * 的机制：Composition Profile 由 `bun run --filter @g2-composition/schema resolve` 在构建期
 * 解析并写死进 `.resolved.json`，而旧仓 qiankun 清单需要能在不重新构建 Shell 的情况下按运行环境
 * 增删——这正是旧仓当年选它的原因（`main.js` 里可以在运行时动态 push/替换 `microApps` 项）。
 * 把它塞进 Composition Profile schema 会让两种生命周期混在一起，且这本身是要被整体删除的临时兼容层
 * （ADR-0031），不应该演化成 Composition 契约的长期字段。
 *
 * 目前所有 `deploy/compositions/*.yaml` 域都是原生 MF（`inline`/`remotes`），没有任何域走 qiankun 桥，
 * 所以在没有真实运行时注入之前，这里如实解析出空数组——不是硬编码假装「以后再接」，而是运行时配置
 * 缺失时理应返回空的诚实结果。一旦某个环境真的注入了 `window.config.microApps`，这里会解析出非空
 * 清单，`registerLegacyMicroApps`（`qiankun-bridge.ts`）会自然被激活，不需要改动周围结构。
 */
export interface LegacyWindowConfig {
  microApps?: unknown;
  homeEntry?: unknown;
}

/**
 * 工作台 entry 缺省值：对齐字典 FRONTEND_CONFIG（bimops-manage-web）当前下发的 homeEntry。
 * 运行时优先被 `loadAndApplyFrontendConfig` 覆盖。
 */
export const DEFAULT_WORKBENCH_ENTRY = "/apps/@ghcloud/cube-workbench-app/";

function isLegacyMicroAppConfig(value: unknown): value is LegacyMicroAppConfig {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" && candidate.name.length > 0 && typeof candidate.entry === "string" && candidate.entry.length > 0
  );
}

/**
 * @param windowConfig 对应旧仓 `window.config`（`use-child-application.ts` 里 `window.config.microApps`
 * 的挂载对象），不是 `window` 本身。调用方从 `window.config` 取值传入，本函数只负责校验/过滤，不关心
 * 这个对象具体挂在全局的哪个路径下。
 */
export function resolveLegacyMicroApps(windowConfig: unknown): LegacyMicroAppConfig[] {
  if (typeof windowConfig !== "object" || windowConfig === null) {
    return [];
  }
  const raw = (windowConfig as LegacyWindowConfig).microApps;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(isLegacyMicroAppConfig);
}

/**
 * 工作台 qiankun 入口：读 `window.config.homeEntry`；缺省或非法时回落到
 * {@link DEFAULT_WORKBENCH_ENTRY}（与旧仓 config.js 一致）。
 */
export function resolveWorkbenchEntry(windowConfig: unknown): string {
  if (typeof windowConfig === "object" && windowConfig !== null) {
    const raw = (windowConfig as LegacyWindowConfig).homeEntry;
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }
  }
  return DEFAULT_WORKBENCH_ENTRY;
}
