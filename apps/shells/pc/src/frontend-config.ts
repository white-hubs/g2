import { BIMOPS_PC_TERMINAL } from "./legacy-constants";

/**
 * 旧仓 `main.js#getProjectInfo`：用字典 FRONTEND_CONFIG 覆盖 `window.config`
 *（`homeEntry` / `microApps` / `terminal` / `systemName` 等），代替静态 config.js。
 */
export const FRONTEND_CONFIG_ITEM_CODE = "FRONTEND_CONFIG";

export function buildFrontendConfigUrl(terminalCode: string = BIMOPS_PC_TERMINAL): string {
  const params = new URLSearchParams({
    itemCode: FRONTEND_CONFIG_ITEM_CODE,
    code: terminalCode,
  });
  return `/api/dictionary/getSysDictionaryByCodeAndItemCode?${params.toString()}`;
}

/** 解析字典接口 body：`variable` 为 JSON 字符串。 */
export function parseFrontendConfigVariable(variable: unknown): Record<string, unknown> | null {
  if (typeof variable !== "string" || variable.trim().length === 0) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(variable);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function mergeFrontendConfigIntoWindowConfig(
  existing: Record<string, unknown> | undefined,
  frontend: Record<string, unknown>,
): Record<string, unknown> {
  const localFeature =
    existing && typeof existing.feature === "object" && existing.feature !== null && !Array.isArray(existing.feature)
      ? (existing.feature as Record<string, unknown>)
      : {};
  const remoteFeature =
    typeof frontend.feature === "object" && frontend.feature !== null && !Array.isArray(frontend.feature)
      ? (frontend.feature as Record<string, unknown>)
      : {};
  return {
    ...existing,
    ...frontend,
    // 本地 feature 优先（对齐旧仓苏州公安网登录覆盖）
    feature: { ...remoteFeature, ...localFeature },
  };
}

export type FetchJson = (url: string) => Promise<unknown>;

/**
 * 拉取 FRONTEND_CONFIG 并合并进 `window.config`。失败时保留现有 config（与旧仓 catch 空操作一致）。
 */
export async function loadAndApplyFrontendConfig(
  targetWindow: Window & { config?: Record<string, unknown> },
  fetchJson: FetchJson = defaultFetchJson,
  terminalCode: string = BIMOPS_PC_TERMINAL,
): Promise<Record<string, unknown> | null> {
  try {
    const body = await fetchJson(buildFrontendConfigUrl(terminalCode));
    if (typeof body !== "object" || body === null) {
      return null;
    }
    const parsed = parseFrontendConfigVariable((body as { variable?: unknown }).variable);
    if (!parsed) {
      return null;
    }
    const merged = mergeFrontendConfigIntoWindowConfig(targetWindow.config, parsed);
    targetWindow.config = merged;
    if (typeof merged.systemName === "string" && merged.systemName.length > 0) {
      targetWindow.document.title = merged.systemName;
    }
    return merged;
  } catch {
    return null;
  }
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json", "content-type": "application/json;charset=utf-8" },
  });
  if (!response.ok) {
    throw new Error(`FRONTEND_CONFIG HTTP ${response.status}`);
  }
  return response.json();
}

/**
 * vite-plugin-qiankun 子应用导出名通常等于 entry 路径最后一段
 *（如 `/apps/@ghcloud/cube-workbench-app/` → `cube-workbench-app`）。
 */
export function resolveQiankunAppNameFromEntry(entry: string): string {
  const path = entry
    .trim()
    .replace(/[?#].*$/u, "")
    .replace(/\/+$/u, "");
  const segment = path.split("/").filter(Boolean).pop();
  return segment && segment.length > 0 ? segment : "cube-workbench-app";
}
