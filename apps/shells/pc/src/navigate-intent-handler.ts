import type { EventBus } from "@g2-composition/contract";

import type { NavigateIntentParams } from "./mf-domain-navigate";

/** 与 pc-auth / pc-rtc 约定同一事件名（对齐旧仓 MF_ROOT_TO_APPLICATION 语义）。 */
export const NAVIGATE_INTENT_EVENT = "navigate-intent";

export interface NavigateIntentPayload {
  code?: string;
  path?: string;
  /** MF 域结构化参数：壳拼到 `/d/{code}/…`；勿把完整 path 当契约。 */
  params?: NavigateIntentParams;
}

export interface NavigateIntentHandlerDeps {
  navigate: (path: string) => void;
  waitNavReady: () => Promise<void>;
  /**
   * 按应用 code 解析目标 path（MF 域索引优先，其次 OUAA 首菜单）。
   * 第二参为可选结构化 params（entry / appCode）。
   */
  resolvePathForCode: (code: string, params?: NavigateIntentParams) => Promise<string | undefined>;
  personManageFirstPath: string;
  onError: (message: string) => void;
}

function asPayload(raw: unknown): NavigateIntentPayload {
  if (raw === null || typeof raw !== "object") {
    return {};
  }
  const record = raw as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code.trim() : "";
  const path = typeof record.path === "string" ? record.path.trim() : "";
  let params: NavigateIntentParams | undefined;
  if (record.params !== null && typeof record.params === "object") {
    const p = record.params as Record<string, unknown>;
    const appCode = typeof p.appCode === "string" ? p.appCode.trim() : "";
    const entry = typeof p.entry === "string" ? p.entry.trim() : "";
    const query: Record<string, string> = {};
    if (p.query !== null && typeof p.query === "object" && !Array.isArray(p.query)) {
      for (const [key, value] of Object.entries(p.query as Record<string, unknown>)) {
        if (typeof value === "string" && value.trim()) {
          query[key] = value.trim();
        }
      }
    }
    // 兼容报警弹窗等把 id/businessKey/deviceId 平铺在 params 上（非 entry/appCode）。
    for (const key of ["id", "businessKey", "deviceId", "type"] as const) {
      const value = p[key];
      if (typeof value === "string" && value.trim() && query[key] === undefined) {
        query[key] = value.trim();
      }
    }
    if (appCode || entry || Object.keys(query).length > 0) {
      params = {
        ...(appCode ? { appCode } : {}),
        ...(entry ? { entry } : {}),
        ...(Object.keys(query).length > 0 ? { query } : {}),
      };
    }
  }
  return {
    ...(code ? { code } : {}),
    ...(path ? { path } : {}),
    ...(params ? { params } : {}),
  };
}

async function resolveTargetPath(payload: NavigateIntentPayload, deps: NavigateIntentHandlerDeps): Promise<string | undefined> {
  const code = payload.code;
  // ADR-0059：有 code 时以 code/entry 为准，忽略 path（path 仅无 code 时迁移兼容）。
  if (code) {
    if (code === "PERSON-MANAGE") {
      return deps.personManageFirstPath || undefined;
    }
    return deps.resolvePathForCode(code, payload.params);
  }
  if (payload.path && payload.path !== "/about") {
    return payload.path;
  }
  return undefined;
}

/** 处理单次跳转意图（公开，便于单测 await）。 */
export async function handleNavigateIntent(raw: unknown, deps: NavigateIntentHandlerDeps): Promise<void> {
  await deps.waitNavReady();
  const payload = asPayload(raw);
  const target = await resolveTargetPath(payload, deps);
  if (target) {
    deps.navigate(target);
    return;
  }
  deps.onError("该应用下未分配菜单");
}

/**
 * 门面消费「跳转到某应用/路径」意图：工作台 / auth / rtc 均经此落地 `router.push`。
 * 后来的 intent 覆盖进行中的（generation token）。
 */
export function installNavigateIntentHandler(bus: EventBus, deps: NavigateIntentHandlerDeps): () => void {
  let generation = 0;
  return bus.subscribe(NAVIGATE_INTENT_EVENT, (raw) => {
    const current = ++generation;
    void (async () => {
      await deps.waitNavReady();
      if (current !== generation) {
        return;
      }
      const payload = asPayload(raw);
      const target = await resolveTargetPath(payload, deps);
      if (current !== generation) {
        return;
      }
      if (target) {
        deps.navigate(target);
        return;
      }
      deps.onError("该应用下未分配菜单");
    })();
  });
}
