/** 二维组态页面规范形态：单设备 / 多设备。 */
export type SceneScopeKind = "singleDevice" | "multiDevice";
/** 旧版三形态，仅用于历史数据兼容和旧业务过渡。 */
export type LegacySceneScopeKind = "device" | "facilityRoom" | "electricalCenter";

export const SCENE_SCOPE_KINDS = ["singleDevice", "multiDevice"] as const satisfies readonly SceneScopeKind[];

export const SCENE_SCOPE_KIND_LABELS: Record<SceneScopeKind, string> = {
  singleDevice: "单设备",
  multiDevice: "多设备",
};

export function isSceneScopeKind(value: unknown): value is SceneScopeKind {
  return value === "singleDevice" || value === "multiDevice";
}

export function isLegacySceneScopeKind(value: unknown): value is LegacySceneScopeKind {
  return value === "device" || value === "facilityRoom" || value === "electricalCenter";
}

export function normalizeSceneScope(value: unknown): SceneScopeKind {
  if (isSceneScopeKind(value)) {
    return value;
  }
  if (value === "electricalCenter" || value === "facilityRoom") {
    return "multiDevice";
  }
  return "singleDevice";
}

/** 根据画布中需要绑定设备的图元数量推导页面形态：0-1 个为单设备，2 个及以上为多设备。 */
export function inferSceneScopeFromElements(elements: ReadonlyArray<{ deviceBinding?: unknown }>): SceneScopeKind {
  let requiredBindingCount = 0;
  for (const element of elements) {
    if (element.deviceBinding !== "required") {
      continue;
    }
    requiredBindingCount++;
    if (requiredBindingCount > 1) {
      return "multiDevice";
    }
  }
  return "singleDevice";
}

/** 完整页面以画布图元为准；无 elements 时才使用保存值兼容旧列表数据。 */
export function resolvePageSceneScope(page: {
  sceneScope?: unknown;
  elements?: ReadonlyArray<{ deviceBinding?: unknown }>;
}): SceneScopeKind {
  if (Array.isArray(page.elements)) {
    return inferSceneScopeFromElements(page.elements);
  }
  return normalizeSceneScope(page.sceneScope);
}

export function parseStoredPagePayload(content: string): unknown {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (parsed && typeof parsed === "object" && parsed !== null && "page" in parsed) {
      return (parsed as { page: unknown }).page;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hasExplicitSceneScope(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") {
    return false;
  }
  const value = (raw as { sceneScope?: unknown }).sceneScope;
  return isSceneScopeKind(value) || isLegacySceneScopeKind(value);
}

/** 仅在 content 显式写入规范或旧版 sceneScope 时返回归一化结果。 */
export function readExplicitSceneScopeFromContent(content: string | undefined | null): SceneScopeKind | undefined {
  if (!content) {
    return undefined;
  }
  const raw = parseStoredPagePayload(content);
  return hasExplicitSceneScope(raw) ? resolvePageSceneScope(raw as { sceneScope?: unknown }) : undefined;
}

/** 读取旧版原始形态；新两形态返回 undefined，供尚未迁移的业务隔离使用。 */
export function readLegacySceneScopeFromContent(content: string | undefined | null): LegacySceneScopeKind | undefined {
  if (!content) {
    return undefined;
  }
  const raw = parseStoredPagePayload(content);
  if (!raw || typeof raw !== "object") {
    return undefined;
  }
  const value = (raw as { sceneScope?: unknown }).sceneScope;
  return isLegacySceneScopeKind(value) ? value : undefined;
}
