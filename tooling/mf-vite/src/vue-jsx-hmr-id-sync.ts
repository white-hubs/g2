import type { Plugin } from "vite";

/**
 * @module-federation/vite 的 Vue adapter 只改写 `Comp.__hmrId = "..."`，
 * 不会同步 vue-jsx 注入的 `createRecord("hash")` / `reload("hash")`。
 * 结果是实例挂在 `federation-hash` 上，HMR 却去更新 `hash`，页面热更新无效果。
 *
 * 本插件必须排在 MF vue adapter 之后（同为 `enforce: "post"`）。
 */
export function syncVueJsxHmrRecordIds(code: string): string | undefined {
  if (!code.includes("__VUE_HMR_RUNTIME__.createRecord(") || !code.includes(".__hmrId")) {
    return undefined;
  }

  const shortToFull = new Map<string, string>();
  const fullIds = [...code.matchAll(/\.__hmrId\s*=\s*(["'])([^"']+)\1/g)].map((m) => m[2]);
  const shortIds = [...code.matchAll(/__VUE_HMR_RUNTIME__\.createRecord\(\s*(["'])([^"']+)\1/g)].map((m) => m[2]);

  for (const fullId of fullIds) {
    for (const shortId of shortIds) {
      if (shortId === fullId) continue;
      // MF adapter: `${federationName}-${originalId}`
      if (fullId.endsWith(`-${shortId}`)) {
        shortToFull.set(shortId, fullId);
      }
    }
  }

  if (shortToFull.size === 0) {
    return undefined;
  }

  let rewritten = code;
  for (const [shortId, fullId] of shortToFull) {
    rewritten = rewritten.replaceAll(`__VUE_HMR_RUNTIME__.createRecord("${shortId}"`, `__VUE_HMR_RUNTIME__.createRecord("${fullId}"`);
    rewritten = rewritten.replaceAll(`__VUE_HMR_RUNTIME__.createRecord('${shortId}'`, `__VUE_HMR_RUNTIME__.createRecord('${fullId}'`);
    rewritten = rewritten.replaceAll(`__VUE_HMR_RUNTIME__.reload("${shortId}"`, `__VUE_HMR_RUNTIME__.reload("${fullId}"`);
    rewritten = rewritten.replaceAll(`__VUE_HMR_RUNTIME__.reload('${shortId}'`, `__VUE_HMR_RUNTIME__.reload('${fullId}'`);
  }
  return rewritten === code ? undefined : rewritten;
}

/** DEV：在 MF Vue adapter 之后对齐 JSX HMR id。 */
export function vueJsxHmrIdSyncPlugin(): Plugin {
  return {
    name: "g2-vue-jsx-hmr-id-sync",
    apply: "serve",
    enforce: "post",
    // MF `module-federation-dev-remote-hmr` uses transform.order:"post" to rewrite
    // `.__hmrId`. We must use the same order and sit later in the plugin list so
    // createRecord/reload see the prefixed id.
    transform: {
      order: "post",
      handler(code) {
        const rewritten = syncVueJsxHmrRecordIds(code);
        return rewritten === undefined ? undefined : rewritten;
      },
    },
  };
}
