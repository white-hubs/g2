export interface MfDomainRemoteRef {
  name: string;
  basePath: string;
  /**
   * 菜单归属码：触发侧栏剥 OUAA portal 叶子（ADR-0062）。
   * 与逻辑名、`/d/{appRegistryCode}` 一并索引。
   */
  navigateCodes?: string[];
  /**
   * Intent 可跳码：仅供 navigate-intent 解析，不剥侧栏。
   * 缺省时回退到 navigateCodes。
   */
  intentCodes?: string[];
}

export interface NavigateIntentParams {
  appCode?: string;
  entry?: string;
  /** 拼到 path 后的 query（如报警详情 id / businessKey）。 */
  query?: Record<string, string>;
}

function stringCodesFromConfig(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((code): code is string => typeof code === "string" && code.trim().length > 0).map((code) => code.trim());
}

/** 从 Profile remote.config.navigateCodes 解析菜单归属码。 */
export function navigateCodesFromRemoteConfig(config?: Record<string, unknown>): string[] {
  return stringCodesFromConfig(config?.navigateCodes);
}

/** Intent 可跳码；未配置时回退菜单归属码。 */
export function intentCodesFromRemoteConfig(config?: Record<string, unknown>): string[] {
  const intent = stringCodesFromConfig(config?.intentCodes);
  if (intent.length > 0) {
    return intent;
  }
  return navigateCodesFromRemoteConfig(config);
}

function seedBasePathKeys(index: Map<string, string>, remote: MfDomainRemoteRef): void {
  index.set(remote.name, remote.basePath);
  const match = remote.basePath.match(/^\/d\/([^/]+)/);
  if (match?.[1]) {
    index.set(match[1], remote.basePath);
  }
}

/** 菜单归属索引：逻辑名 + `/d/{code}` + navigateCodes（剥侧栏用）。 */
export function buildMfDomainMenuOwningIndex(remotes: MfDomainRemoteRef[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const remote of remotes) {
    seedBasePathKeys(index, remote);
    for (const code of remote.navigateCodes ?? []) {
      if (code) {
        index.set(code, remote.basePath);
      }
    }
  }
  return index;
}

/** Intent 索引：逻辑名 + `/d/{code}` + intentCodes（缺省=navigateCodes）。 */
export function buildMfDomainIntentIndex(remotes: MfDomainRemoteRef[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const remote of remotes) {
    seedBasePathKeys(index, remote);
    const codes = remote.intentCodes?.length ? remote.intentCodes : (remote.navigateCodes ?? []);
    for (const code of codes) {
      if (code) {
        index.set(code, remote.basePath);
      }
    }
  }
  return index;
}

/**
 * @deprecated 兼容旧调用：等同菜单归属索引。新代码请用 menuOwning / intent 双索引。
 */
export function buildMfDomainPathIndex(remotes: MfDomainRemoteRef[]): Map<string, string> {
  return buildMfDomainMenuOwningIndex(remotes);
}

/**
 * MF 域跨跳：`code` → basePath；可选 `entry` / `appCode` 拼到其后（G2e）。
 * 禁止把完整 path 当长期契约——调用方应传 code + params。
 */
export function resolveMfDomainNavigatePath(
  code: string,
  params: NavigateIntentParams | undefined,
  index: Map<string, string>,
): string | undefined {
  const base = index.get(code);
  if (!base) {
    return undefined;
  }
  const trimmed = base.replace(/\/$/, "");
  let path = trimmed;
  if (params?.entry) {
    const entry = String(params.entry).replace(/^\//, "");
    path = `${trimmed}/${entry}`;
  } else if (params?.appCode) {
    path = `${trimmed}/${params.appCode}`;
  }
  const query = params?.query;
  if (query) {
    const qs = Object.entries(query)
      .filter(([, value]) => value !== undefined && String(value).length > 0)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join("&");
    if (qs) {
      return `${path}?${qs}`;
    }
  }
  return path;
}
