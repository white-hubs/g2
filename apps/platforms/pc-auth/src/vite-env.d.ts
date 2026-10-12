/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 为 true/1 时允许「记住我」持久化密码密文；默认关闭。 */
  readonly VITE_PC_AUTH_REMEMBER_PASSWORD?: string;
  /**
   * nginx/部署注入的固定系统标题（无缓存时使用）。
   * TODO(ops-platform): 后续由 BFF 或运维管理平台下发。
   */
  readonly VITE_PC_AUTH_SYSTEM_TITLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
