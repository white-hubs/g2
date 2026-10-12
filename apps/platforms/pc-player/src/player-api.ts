export interface CubePlayerAuth {
  token?: string;
  tenant?: string;
  terminal?: string;
}

type CubePlayerAuthSource = CubePlayerAuth | (() => CubePlayerAuth);

let configuredAuth: CubePlayerAuthSource | undefined;

export function initCubePlayerAuth(auth: CubePlayerAuthSource): void {
  configuredAuth = auth;
}

export function getCubePlayerAuthHeaders(): Record<string, string> {
  const fromConfig = typeof configuredAuth === "function" ? configuredAuth() : configuredAuth;
  const fromShell =
    typeof window === "undefined" ? undefined : (window as Window & { __CUBE_AUTH_INFO__?: CubePlayerAuth }).__CUBE_AUTH_INFO__;
  const auth = fromConfig?.token ? fromConfig : fromShell;
  if (!auth?.token) return {};
  return {
    Authorization: `Bearer ${auth.token}`,
    tenant: auth.tenant ?? "",
    terminal: auth.terminal?.trim() || "bimops-manage-web",
  };
}

export async function loadPlayerSDK(): Promise<void> {
  // wasm SDK 懒加载入口占位；当前主路径用原生 video
}
