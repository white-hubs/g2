import type { Registry, ResolvedProfile, SourceProfile } from "./types";

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//u.test(value);
}

export function joinReleaseUrl(base: string, key: string): string {
  const b = base.replace(/\/+$/u, "");
  const k = key.replace(/^\/+/u, "");
  return `${b}/${k}`;
}

export function resolveEntryFromRegistry(registry: Registry, logicalName: string): string | undefined {
  const raw = registry[logicalName];
  if (raw === undefined || raw === "") return undefined;
  if (isAbsoluteUrl(raw)) return raw;
  const base = registry.webReleaseBase;
  if (!base) {
    throw new Error(`registry entry "${logicalName}" is a relative key but webReleaseBase is missing`);
  }
  return joinReleaseUrl(base, raw);
}

export function resolveProfile(source: SourceProfile, registry: Registry): ResolvedProfile {
  const missing: string[] = [];

  const coreRuntime = (source.coreRuntime ?? []).map((item) => {
    const entry = resolveEntryFromRegistry(registry, item.logicalName);
    if (!entry) {
      missing.push(item.logicalName);
      return { name: item.name, entry: "", apiVersion: item.apiVersion };
    }
    return { name: item.name, entry, apiVersion: item.apiVersion };
  });

  const platform = source.platform.map((item) => {
    const entry = resolveEntryFromRegistry(registry, item.logicalName);
    if (!entry) {
      missing.push(item.logicalName);
      return { name: item.name, entry: "", config: item.config };
    }
    return { name: item.name, entry, config: item.config };
  });

  const remotes = source.remotes.map((item) => {
    const entry = resolveEntryFromRegistry(registry, item.logicalName);
    if (!entry) {
      missing.push(item.logicalName);
      return { name: item.name, entry: "", basePath: item.basePath, config: item.config };
    }
    return { name: item.name, entry, basePath: item.basePath, config: item.config };
  });

  const client = (source.client ?? []).map((item) => {
    const entry = resolveEntryFromRegistry(registry, item.logicalName);
    if (!entry) {
      missing.push(item.logicalName);
      return { name: item.name, entry: "" };
    }
    return { name: item.name, entry };
  });

  const pageLibrary = (source.pageLibrary ?? []).map((item) => {
    const entry = resolveEntryFromRegistry(registry, item.logicalName);
    if (!entry) {
      missing.push(item.logicalName);
      return { name: item.name, entry: "" };
    }
    return { name: item.name, entry };
  });

  if (missing.length > 0) {
    throw new Error(`registry missing entries for logical name(s): ${missing.join(", ")}`);
  }

  return {
    facade: source.facade,
    env: source.env,
    coreRuntime,
    platform,
    client,
    pageLibrary,
    inline: source.inline.map((item) => ({ ...item, allowOverride: item.allowOverride ?? false })),
    remotes,
    backendApiBaseUrl: resolveBaseUrlFromRegistry(registry),
    staticResourceBaseUrl: resolveStaticResourceBaseFromRegistry(registry),
  };
}

export function resolveBaseUrlFromRegistry(registry: Registry): string | undefined {
  return registry.backendApi;
}

/** 注册表逻辑名 `staticResourceBase`；空串/缺失 → undefined（同源 `/resource`，ADR-0048 同型）。 */
export function resolveStaticResourceBaseFromRegistry(registry: Registry): string | undefined {
  const value = registry.staticResourceBase;
  if (value === undefined || value === "") {
    return undefined;
  }
  return value.replace(/\/+$/u, "");
}
