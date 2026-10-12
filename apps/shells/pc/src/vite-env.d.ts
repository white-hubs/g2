/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RESOLVED_PROFILE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __G2_DEV_WORKSPACE_ROOT__?: string;
  config?: {
    microApps?: unknown;
    homeEntry?: unknown;
    terminal?: string;
    feature?: {
      outsideTenants?: unknown;
      [key: string]: unknown;
    };
  };
  /**
   * TODO(ADR-0031): qiankun 兼容层迁完后删除。
   * 旧仓子应用鉴权快照；门户微应用另读 sessionStorage GH-Token / GH-NowEnterprise 等。
   */
  __CUBE_AUTH_INFO__?: {
    token: string;
    tenant: string;
    terminal: string;
  };
}

declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

declare module "*.png" {
  const src: string;
  export default src;
}
