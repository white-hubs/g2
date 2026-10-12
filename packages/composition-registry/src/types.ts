export interface SourcePlatformItem {
  name: string;
  logicalName: string;
  config?: Record<string, unknown>;
}
export interface SourceCoreRuntimeItem {
  name: string;
  logicalName: string;
  apiVersion?: string;
}
export interface SourceInlineItem {
  name: string;
  package: string;
  basePath: string;
  allowOverride?: boolean;
}
export interface SourceRemoteItem {
  name: string;
  logicalName: string;
  basePath: string;
  /** 透传给 DomainInstall 第三参（如 applicationCode）。 */
  config?: Record<string, unknown>;
}
export interface SourceClientItem {
  name: string;
  logicalName: string;
}
export interface SourcePageLibraryItem {
  name: string;
  logicalName: string;
}
export interface SourceProfile {
  facade: "pc" | "h5";
  env: string;
  coreRuntime?: SourceCoreRuntimeItem[];
  platform: SourcePlatformItem[];
  client?: SourceClientItem[];
  pageLibrary?: SourcePageLibraryItem[];
  inline: SourceInlineItem[];
  remotes: SourceRemoteItem[];
}

export type Registry = Record<string, string>;

export interface ResolvedPlatformItem {
  name: string;
  entry: string;
  config?: Record<string, unknown>;
}
export interface ResolvedCoreRuntimeItem {
  name: string;
  entry: string;
  apiVersion?: string;
}
export interface ResolvedInlineItem {
  name: string;
  package: string;
  basePath: string;
  allowOverride: boolean;
}
export interface ResolvedRemoteItem {
  name: string;
  entry: string;
  basePath: string;
  config?: Record<string, unknown>;
}
export interface ResolvedClientItem {
  name: string;
  entry: string;
}
export interface ResolvedPageLibraryItem {
  name: string;
  entry: string;
}
export interface ResolvedProfile {
  facade: "pc" | "h5";
  env: string;
  coreRuntime?: ResolvedCoreRuntimeItem[];
  platform: ResolvedPlatformItem[];
  client: ResolvedClientItem[];
  /** 页面库 remotes（ADR-0060）；缺省视为 []。 */
  pageLibrary?: ResolvedPageLibraryItem[];
  inline: ResolvedInlineItem[];
  remotes: ResolvedRemoteItem[];
  backendApiBaseUrl?: string;
  /** 静态资源 CDN 前缀（注册表逻辑名 `staticResourceBase`）；空/缺省表示同源 `/resource`。 */
  staticResourceBaseUrl?: string;
}
