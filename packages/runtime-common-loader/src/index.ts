export interface RuntimeCommonInfo {
  runtimeVersion: string;
  apiVersion: string;
  compatibility?: { minConsumer: string; maxConsumer: string };
}

export interface RuntimeCommonSpec {
  name: string;
  /** API range accepted by this shell/consumer, e.g. `1.x`. */
  apiVersion?: string;
}

export interface RuntimeCommonDiagnostic {
  name: string;
  state: "pending" | "ready" | "failed";
  runtimeVersion?: string;
  apiVersion?: string;
  error?: string;
}

export type RuntimeCommonRemoteLoader = (remoteName: string, exposed: string) => Promise<unknown>;

const GLOBAL_LOADER_KEY = "__g2RuntimeCommonLoad__";
const GLOBAL_DIAGNOSTICS_KEY = "__g2RuntimeCommonDiagnostics__";
type RuntimeCommonGlobal = typeof globalThis & {
  [GLOBAL_LOADER_KEY]?: RuntimeCommonRemoteLoader;
  [GLOBAL_DIAGNOSTICS_KEY]?: () => RuntimeCommonDiagnostic[];
};

/** Register the Shell-owned loader so independently loaded page libraries use the same cache and diagnostics path. */
export function setRuntimeCommonLoader(loader: RuntimeCommonRemoteLoader): void {
  (globalThis as RuntimeCommonGlobal)[GLOBAL_LOADER_KEY] = loader;
}

/** Expose read-only loader state to Shell bootstrap diagnostics before Vue mounts. */
export function setRuntimeCommonDiagnosticsProvider(provider: () => RuntimeCommonDiagnostic[]): void {
  (globalThis as RuntimeCommonGlobal)[GLOBAL_DIAGNOSTICS_KEY] = provider;
}

export function getRuntimeCommonDiagnostics(): RuntimeCommonDiagnostic[] {
  return (globalThis as RuntimeCommonGlobal)[GLOBAL_DIAGNOSTICS_KEY]?.() ?? [];
}

/** Load a pre-registered runtime common remote from a page library or another context without a DomainContext. */
export function loadRuntimeCommon<T = unknown>(remoteName: string, exposed: string): Promise<T> {
  const loader = (globalThis as RuntimeCommonGlobal)[GLOBAL_LOADER_KEY];
  if (!loader) {
    throw new RuntimeCommonLoadError(remoteName, "loader is not registered by Shell");
  }
  return loader(remoteName, exposed) as Promise<T>;
}

export class RuntimeCommonLoadError extends Error {
  constructor(
    public readonly remoteName: string,
    message: string,
  ) {
    super(`runtime common remote "${remoteName}" ${message}`);
    this.name = "RuntimeCommonLoadError";
  }
}

function compatible(actual: string, expected?: string): boolean {
  if (!expected || expected === "*") return true;
  if (expected.endsWith(".x")) return actual.split(".")[0] === expected.split(".")[0];
  return actual === expected;
}

function asInfo(value: unknown, remoteName: string): RuntimeCommonInfo {
  if (!value || typeof value !== "object") {
    throw new RuntimeCommonLoadError(remoteName, "did not expose a valid ./info module");
  }
  const info = value as Partial<RuntimeCommonInfo>;
  if (typeof info.runtimeVersion !== "string" || typeof info.apiVersion !== "string") {
    throw new RuntimeCommonLoadError(remoteName, "./info must export runtimeVersion and apiVersion strings");
  }
  return info as RuntimeCommonInfo;
}

/**
 * One gateway for all runtime-common imports. It caches successful modules and
 * records failures, so a domain can never silently fall back to its own copy.
 */
export function createRuntimeCommonLoader(loadRemote: RuntimeCommonRemoteLoader) {
  const modules = new Map<string, Promise<unknown>>();
  const diagnostics = new Map<string, RuntimeCommonDiagnostic>();

  const load = <T = unknown>(remoteName: string, exposed: string): Promise<T> => {
    const key = `${remoteName}/${exposed}`;
    if (!modules.has(key)) {
      modules.set(
        key,
        loadRemote(remoteName, exposed).catch((error) => {
          modules.delete(key);
          const current = diagnostics.get(remoteName);
          diagnostics.set(remoteName, { name: remoteName, state: "failed", ...current, error: String(error) });
          throw error;
        }),
      );
    }
    return modules.get(key)! as Promise<T>;
  };

  const preload = async (specs: readonly RuntimeCommonSpec[]): Promise<void> => {
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
          apiVersion: info.apiVersion,
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
    diagnostics: (): RuntimeCommonDiagnostic[] => [...diagnostics.values()],
  };
}
