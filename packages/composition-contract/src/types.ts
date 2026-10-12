import type { App } from "vue";
import type { RouteRecordRaw, Router } from "vue-router";

export type DomainRoutes = RouteRecordRaw[];

/** 按需动态加载 Profile `pageLibrary` 中页面库的某个 MF expose。页面库不拥有路由与 basePath。 */
export type PageLibraryLoader = <T = unknown>(pageLibraryName: string, exposedPath: string) => Promise<T>;

/**
 * 按需加载已由 Shell 预检过版本的 runtime-common Remote expose。
 * 这里不允许退化为 workspace 静态导入，保证域不会携带自己的本地回退副本。
 */
export type RuntimeCommonLoader = <T = unknown>(runtimeName: string, exposedPath: string) => Promise<T>;

/** 当前登录用户拥有的功能码快照。页面宿主用它做页面/操作级能力判断。 */
export type FunctionCodeProvider = () => ReadonlySet<string>;

/** 域安装上下文：与 PlatformContext 对齐的子集，供 ensureClient / navigate-intent / 库型 Platform。 */
export interface DomainContext {
  bus: EventBus;
  getAuthHeaders: AuthHeaderProvider;
  loadPlatform: PlatformLoader;
  loadRuntimeCommon: RuntimeCommonLoader;
  loadPageLibrary: PageLibraryLoader;
  getFunctionCodes: FunctionCodeProvider;
  ensureClient: ServiceClientEnsurer;
}

export type DomainInstall = (app: App, ctx: DomainContext, config?: Record<string, unknown>) => void | Promise<void>;

export interface MenuContributionNode {
  label: string;
  /** 语义色块回退键（无真实 icon URL 时用）。 */
  iconKey?: string;
  /** 应用/菜单图标相对路径，如 `/resource/app-icons/隐患排查/main.png`；渲染前经 resolveStaticResourceUrl。 */
  icon?: string;
  /** 域内默认拼装提示（同域）；跨应用与 overlay 不以 path 为契约（ADR-0059）。 */
  path?: string;
  /** 应用域内路由主键，供菜单叶子与 navigate-intent.params.entry 解析（ADR-0059）。 */
  entry?: string;
  functionCode?: string;
  children?: MenuContributionNode[];
}

export interface DomainModule {
  routes: DomainRoutes;
  install?: DomainInstall;
  menuContribution?: MenuContributionNode[];
}

export type EventName = string;
export interface EventBus {
  publish: (event: EventName, payload?: unknown) => void;
  subscribe: (event: EventName, handler: (payload: unknown) => void) => () => void;
}

export type AuthHeaderProvider = () => Record<string, string>;

/** 按需动态加载另一个 Platform 暴露的模块（MF exposes 路径），供 Platform-to-Platform 消费库能力（如 http client）用；
 * 由 Shell 用真实 MF loader 实现并通过 ctx 注入，Platform 自己不持有 MF loader 实例。 */
export type PlatformLoader = (platformName: string, exposedPath: string) => Promise<unknown>;

/** 按需幂等装载服务 Client（Profile `client` 槽位），返回就绪业务 API（ADR-0057）。 */
export type ServiceClientEnsurer = <T = unknown>(clientName: string) => Promise<T>;

export interface PlatformContext {
  bus: EventBus;
  getAuthHeaders: AuthHeaderProvider;
  loadPlatform: PlatformLoader;
  loadRuntimeCommon: RuntimeCommonLoader;
  ensureClient: ServiceClientEnsurer;
}

export type PlatformInstall = (app: App, router: Router, ctx: PlatformContext, config?: Record<string, unknown>) => void | Promise<void>;

export interface PlatformModule {
  label?: string;
  slots?: Record<string, unknown>;
  install?: PlatformInstall;
}
