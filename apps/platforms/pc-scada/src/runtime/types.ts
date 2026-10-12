import type { Action, DataDriver, PageModel } from "../../vendor/core";

export type RuntimeMode = "iframe" | "webcomponent";

export interface RuntimeContext {
  tenantId?: string;
  projectId?: string;
  deviceId?: string;
  userId?: string;
  token?: string;
  [key: string]: unknown;
}

export interface ActionRequest {
  elementId: string;
  action: Action;
  context: RuntimeContext;
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

export type PageLoader = (pageId: string, context: RuntimeContext) => Promise<PageModel>;

export interface RuntimeOptions {
  container: HTMLElement;
  mode?: RuntimeMode;
  dataAdapter: DataDriver;
  /** 业务方授权回调，Runtime 发出动作意图请求时调用；不提供则所有动作直接执行 */
  onActionRequest?: (request: ActionRequest) => Promise<ActionResult>;
  pageLoader?: PageLoader;
}

export interface RuntimeContainer {
  init(): Promise<void> | void;
  loadPage(page: PageModel, context: RuntimeContext): Promise<void> | void;
  setContext(context: RuntimeContext): Promise<void> | void;
  dispose(): Promise<void> | void;
}

export interface RuntimeApi {
  init(): Promise<void>;
  loadPage(pageOrId: PageModel | string, context?: Partial<RuntimeContext>): Promise<void>;
  setContext(context: Partial<RuntimeContext>): Promise<void>;
  dispose(): Promise<void>;
}
