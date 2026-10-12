// @bun
// src/resolve-profile.ts
function isAbsoluteUrl(value) {
  return /^https?:\/\//u.test(value);
}
function joinReleaseUrl(base, key) {
  const b = base.replace(/\/+$/u, "");
  const k = key.replace(/^\/+/u, "");
  return `${b}/${k}`;
}
function resolveEntryFromRegistry(registry, logicalName) {
  const raw = registry[logicalName];
  if (raw === undefined || raw === "")
    return;
  if (isAbsoluteUrl(raw))
    return raw;
  const base = registry.webReleaseBase;
  if (!base) {
    throw new Error(`registry entry "${logicalName}" is a relative key but webReleaseBase is missing`);
  }
  return joinReleaseUrl(base, raw);
}
function resolveProfile(source, registry) {
  const missing = [];
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
    staticResourceBaseUrl: resolveStaticResourceBaseFromRegistry(registry)
  };
}
function resolveBaseUrlFromRegistry(registry) {
  return registry.backendApi;
}
function resolveStaticResourceBaseFromRegistry(registry) {
  const value = registry.staticResourceBase;
  if (value === undefined || value === "") {
    return;
  }
  return value.replace(/\/+$/u, "");
}
export {
  resolveStaticResourceBaseFromRegistry,
  resolveProfile,
  resolveEntryFromRegistry,
  resolveBaseUrlFromRegistry,
  joinReleaseUrl
};
