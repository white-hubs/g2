// @bun
// src/index.ts
var GLOBAL_LOADER_KEY = "__g2RuntimeCommonLoad__";
var GLOBAL_DIAGNOSTICS_KEY = "__g2RuntimeCommonDiagnostics__";
function setRuntimeCommonLoader(loader) {
  globalThis[GLOBAL_LOADER_KEY] = loader;
}
function setRuntimeCommonDiagnosticsProvider(provider) {
  globalThis[GLOBAL_DIAGNOSTICS_KEY] = provider;
}
function getRuntimeCommonDiagnostics() {
  return globalThis[GLOBAL_DIAGNOSTICS_KEY]?.() ?? [];
}
function loadRuntimeCommon(remoteName, exposed) {
  const loader = globalThis[GLOBAL_LOADER_KEY];
  if (!loader) {
    throw new RuntimeCommonLoadError(remoteName, "loader is not registered by Shell");
  }
  return loader(remoteName, exposed);
}

class RuntimeCommonLoadError extends Error {
  remoteName;
  constructor(remoteName, message) {
    super(`runtime common remote "${remoteName}" ${message}`);
    this.remoteName = remoteName;
    this.name = "RuntimeCommonLoadError";
  }
}
function compatible(actual, expected) {
  if (!expected || expected === "*")
    return true;
  if (expected.endsWith(".x"))
    return actual.split(".")[0] === expected.split(".")[0];
  return actual === expected;
}
function asInfo(value, remoteName) {
  if (!value || typeof value !== "object") {
    throw new RuntimeCommonLoadError(remoteName, "did not expose a valid ./info module");
  }
  const info = value;
  if (typeof info.runtimeVersion !== "string" || typeof info.apiVersion !== "string") {
    throw new RuntimeCommonLoadError(remoteName, "./info must export runtimeVersion and apiVersion strings");
  }
  return info;
}
function createRuntimeCommonLoader(loadRemote) {
  const modules = new Map;
  const diagnostics = new Map;
  const load = (remoteName, exposed) => {
    const key = `${remoteName}/${exposed}`;
    if (!modules.has(key)) {
      modules.set(key, loadRemote(remoteName, exposed).catch((error) => {
        modules.delete(key);
        const current = diagnostics.get(remoteName);
        diagnostics.set(remoteName, { name: remoteName, state: "failed", ...current, error: String(error) });
        throw error;
      }));
    }
    return modules.get(key);
  };
  const preload = async (specs) => {
    for (const spec of specs) {
      diagnostics.set(spec.name, { name: spec.name, state: "pending" });
      try {
        const info = asInfo(await load(spec.name, "info"), spec.name);
        if (!compatible(info.apiVersion, spec.apiVersion)) {
          throw new RuntimeCommonLoadError(spec.name, `API ${info.apiVersion} is incompatible with required ${spec.apiVersion}`);
        }
        diagnostics.set(spec.name, {
          name: spec.name,
          state: "ready",
          runtimeVersion: info.runtimeVersion,
          apiVersion: info.apiVersion
        });
      } catch (error) {
        const failure = error instanceof RuntimeCommonLoadError ? error : new RuntimeCommonLoadError(spec.name, String(error));
        diagnostics.set(spec.name, { name: spec.name, state: "failed", error: failure.message });
        throw failure;
      }
    }
  };
  return {
    load,
    preload,
    diagnostics: () => [...diagnostics.values()]
  };
}
export {
  setRuntimeCommonLoader,
  setRuntimeCommonDiagnosticsProvider,
  loadRuntimeCommon,
  getRuntimeCommonDiagnostics,
  createRuntimeCommonLoader,
  RuntimeCommonLoadError
};
