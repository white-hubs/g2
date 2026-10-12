import type { ProxyOptions } from "vite";

const REMOTE_VERIFY_PROXY_PATHS = [
  "/api",
  "/gw-bff",
  "/third-auth",
  "/scada",
  "/resource",
  "/minio",
  "/apps-legacy",
  "/apps",
  "/config.js",
];
// 风险管控 BFF 已部署在验证环境，必须继续走远端 `/gw-bff/risk-graded-control`。
// 网关根地址的 `/risk-control` 会命中 Shell fallback HTML，并不是风险管控上游服务。
const LOCAL_BFF_PROXY_PATHS = [
  "/gw-bff/command-dispatch",
  "/gw-bff/secure-edu",
  "/gw-bff/emergency-supplies",
  "/gw-bff/security-management/fumigation",
  "/gw-bff/ouaa/departments",
  "/gw-bff/file/upload",
];
const SECURITY_MONITOR_VMONITOR_BFF_PREFIX = "/gw-bff/security-monitor/vmonitor";

/**
 * 开发期只把尚未部署到验证环境的新迁移接口交给本地 BFF。
 * 登录、字典及其他已部署的 BFF 路由仍由验证环境处理。
 */
export function createRemoteVerifyProxy(target: string, localBffTarget?: string): Record<string, ProxyOptions> {
  const localBffProxy = localBffTarget
    ? Object.fromEntries(
        LOCAL_BFF_PROXY_PATHS.map((path) => [path, { target: localBffTarget, changeOrigin: true, secure: false } satisfies ProxyOptions]),
      )
    : {};

  return {
    ...localBffProxy,
    [SECURITY_MONITOR_VMONITOR_BFF_PREFIX]: {
      target,
      changeOrigin: true,
      secure: false,
      rewrite: (path: string) => path.replace(SECURITY_MONITOR_VMONITOR_BFF_PREFIX, "/api/vmonitor"),
    },
    ...Object.fromEntries(REMOTE_VERIFY_PROXY_PATHS.map((path) => [path, { target, changeOrigin: true, secure: false }])),
  };
}
