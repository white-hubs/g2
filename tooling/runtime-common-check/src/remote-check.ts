export interface RuntimeRemoteCheckOptions {
  manifestUrl: string;
  origin: string;
  expectedRuntimeVersion?: string;
  expectedApiVersion?: string;
  minimumCacheAgeSeconds?: number;
  requireImmutable?: boolean;
  fetcher?: typeof fetch;
}

export interface RuntimeRemoteCheckResult {
  manifestUrl: string;
  runtimeVersion: string;
  apiVersion: string;
  resourcesChecked: number;
}

type AssetGroups = {
  js?: { sync?: string[]; async?: string[] };
  css?: { sync?: string[]; async?: string[] };
};

type RemoteManifest = {
  metaData?: { remoteEntry?: { name?: string; path?: string } };
  shared?: Array<{ assets?: AssetGroups }>;
  remotes?: Array<{ assets?: AssetGroups }>;
  exposes?: Array<{ name?: string; path?: string; assets?: AssetGroups }>;
};

function apiVersionMatches(actual: string, expected: string): boolean {
  if (expected === "*") return true;
  if (expected.endsWith(".x")) return actual.split(".")[0] === expected.split(".")[0];
  const expectedParts = expected.split(".");
  const actualParts = actual.split(".");
  return (
    expectedParts.length === actualParts.length && expectedParts.every((part, index) => (part === "x" ? true : part === actualParts[index]))
  );
}

function exportBinding(source: string, exportName: string): string | undefined {
  const exportBlock = source.match(/\bexport\s*\{([^}]*)\}/s)?.[1];
  if (!exportBlock) return undefined;
  for (const specifier of exportBlock.split(",")) {
    const match = specifier.trim().match(/^([\w$]+)(?:\s+as\s+([\w$]+))?$/);
    if (match && (match[2] ?? match[1]) === exportName) return match[1];
  }
  return undefined;
}

function readStaticStringExport(source: string, exportName: string): string | undefined {
  if (/\bimport\s*(?:\(|["'{*])/.test(source)) return undefined;

  const direct = source.match(new RegExp(`\\bexport\\s+(?:const|let|var)\\s+${exportName}\\s*=\\s*([\"'\\x60])([^\"'\\x60]+)\\1`));
  if (direct) return direct[2];

  const binding = exportBinding(source, exportName);
  if (!binding) return undefined;
  const escaped = binding.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const assignment = source.match(
    new RegExp(`(?:\\b(?:const|let|var)\\s+|[,;]\\s*)${escaped}\\s*=\\s*([\"'\\x60])([^\"'\\x60]+)\\1(?=\\s*[,;])`),
  );
  return assignment?.[2];
}

function assetPaths(assets?: AssetGroups): string[] {
  if (!assets) return [];
  return [...(assets.js?.sync ?? []), ...(assets.js?.async ?? []), ...(assets.css?.sync ?? []), ...(assets.css?.async ?? [])];
}

function assertCachePolicy(url: string, cacheControl: string | null, options: RuntimeRemoteCheckOptions, mutable: boolean): void {
  if (!cacheControl) throw new Error(`${url}: 缺少 Cache-Control 响应头`);
  const normalized = cacheControl.toLowerCase();
  if (normalized.includes("no-store")) {
    throw new Error(`${url}: 不允许使用 ${cacheControl}`);
  }
  if (mutable) {
    if (normalized.includes("no-cache")) return;
    const maxAge = normalized.match(/(?:^|,)\s*max-age=(\d+)/)?.[1];
    if (maxAge === undefined || Number(maxAge) > 300) {
      throw new Error(`${url}: manifest/remoteEntry 必须使用 no-cache 或 max-age 不超过 300 秒，实际为 ${cacheControl}`);
    }
    return;
  }
  if (normalized.includes("no-cache")) {
    throw new Error(`${url}: content-hash 资源不允许使用 ${cacheControl}`);
  }
  const maxAge = normalized.match(/(?:^|,)\s*max-age=(\d+)/)?.[1];
  const minimum = options.minimumCacheAgeSeconds ?? 86_400;
  if (maxAge === undefined || Number(maxAge) < minimum) {
    throw new Error(`${url}: max-age 必须至少为 ${minimum} 秒，实际为 ${maxAge ?? "未设置"}`);
  }
  if (options.requireImmutable && !normalized.includes("immutable")) {
    throw new Error(`${url}: 版本化发布资源必须带 immutable，实际为 ${cacheControl}`);
  }
}

function assertCors(url: string, allowedOrigin: string, response: Response): void {
  const allowOrigin = response.headers.get("access-control-allow-origin");
  if (allowOrigin !== "*" && allowOrigin !== allowedOrigin) {
    throw new Error(`${url}: Access-Control-Allow-Origin 应为 ${allowedOrigin} 或 *，实际为 ${allowOrigin ?? "未设置"}`);
  }
  if (allowOrigin === "*" && response.headers.get("access-control-allow-credentials")?.toLowerCase() === "true") {
    throw new Error(`${url}: 不允许将通配 Origin 与 credentials=true 组合`);
  }
}

export async function checkRuntimeRemote(options: RuntimeRemoteCheckOptions): Promise<RuntimeRemoteCheckResult> {
  const fetcher = options.fetcher ?? fetch;
  const origin = new URL(options.origin).origin;
  const manifestUrl = new URL(options.manifestUrl).toString();
  const visited = new Set<string>();

  const request = async (url: string, readBody: boolean, mutable = false): Promise<{ response: Response; body: string }> => {
    const normalizedUrl = new URL(url, manifestUrl).toString();
    if (visited.has(normalizedUrl)) throw new Error(`${normalizedUrl}: manifest 重复引用资源`);
    visited.add(normalizedUrl);
    const response = await fetcher(normalizedUrl, { method: "GET", headers: { Origin: origin }, cache: "no-store" });
    if (!response.ok) throw new Error(`${normalizedUrl}: HTTP ${response.status}`);
    assertCors(normalizedUrl, origin, response);
    assertCachePolicy(normalizedUrl, response.headers.get("cache-control"), options, mutable);
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (normalizedUrl === manifestUrl && !contentType.includes("json")) {
      throw new Error(`${normalizedUrl}: manifest Content-Type 应为 JSON，实际为 ${contentType || "未设置"}`);
    }
    if (/\.m?js(?:\?|$)/i.test(normalizedUrl) && !/(?:javascript|ecmascript)/.test(contentType)) {
      throw new Error(`${normalizedUrl}: JavaScript chunk Content-Type 不正确，实际为 ${contentType || "未设置"}`);
    }
    if (/\.css(?:\?|$)/i.test(normalizedUrl) && !contentType.includes("text/css")) {
      throw new Error(`${normalizedUrl}: CSS chunk Content-Type 不正确，实际为 ${contentType || "未设置"}`);
    }
    const body = readBody ? await response.text() : "";
    if (!readBody) await response.body?.cancel();
    return { response, body };
  };

  const { body: manifestBody } = await request(manifestUrl, true, true);
  let manifest: RemoteManifest;
  try {
    manifest = JSON.parse(manifestBody) as RemoteManifest;
  } catch {
    throw new Error(`${manifestUrl}: 不是有效的 Module Federation manifest JSON`);
  }

  const remoteEntry = manifest.metaData?.remoteEntry;
  if (!remoteEntry?.name) throw new Error(`${manifestUrl}: 缺少 metaData.remoteEntry.name`);
  const infoExpose = manifest.exposes?.find((expose) => expose.path === "./info" || expose.name === "info");
  if (!infoExpose) throw new Error(`${manifestUrl}: 未暴露 ./info`);
  const infoAssets = assetPaths(infoExpose.assets);
  const infoJs = infoAssets.filter((asset) => /\.m?js(?:\?|$)/i.test(asset));
  if (infoJs.length !== 1) throw new Error(`${manifestUrl}: ./info 应对应一个独立 JavaScript chunk，实际 ${infoJs.length} 个`);

  const resources = new Set<string>();
  const remoteEntryUrl = new URL(`${remoteEntry.path ?? ""}${remoteEntry.name}`, manifestUrl).toString();
  resources.add(remoteEntryUrl);
  for (const section of [...(manifest.shared ?? []), ...(manifest.remotes ?? []), ...(manifest.exposes ?? [])]) {
    for (const asset of assetPaths(section.assets)) resources.add(new URL(asset, manifestUrl).toString());
  }
  resources.delete(manifestUrl);

  const infoUrl = new URL(infoJs[0]!, manifestUrl).toString();
  const { body: infoSource } = await request(infoUrl, true);
  const runtimeVersion = readStaticStringExport(infoSource, "runtimeVersion");
  const apiVersion = readStaticStringExport(infoSource, "apiVersion");
  if (!runtimeVersion || !apiVersion) {
    throw new Error(`${infoUrl}: ./info 必须静态导出 runtimeVersion 和 apiVersion 字符串，且不得依赖其他模块`);
  }
  if (options.expectedRuntimeVersion && runtimeVersion !== options.expectedRuntimeVersion) {
    throw new Error(`${infoUrl}: runtimeVersion 应为 ${options.expectedRuntimeVersion}，实际为 ${runtimeVersion}`);
  }
  if (options.expectedApiVersion && !apiVersionMatches(apiVersion, options.expectedApiVersion)) {
    throw new Error(`${infoUrl}: apiVersion ${apiVersion} 不满足 ${options.expectedApiVersion}`);
  }

  for (const resourceUrl of resources) {
    if (resourceUrl === infoUrl) continue;
    await request(resourceUrl, false, resourceUrl === remoteEntryUrl);
  }

  return { manifestUrl, runtimeVersion, apiVersion, resourcesChecked: visited.size };
}
