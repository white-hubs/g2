import type { PageModel } from "../core";
import { BindingEngine, ActionExecutor } from "../engine";
import { IframeContainer } from "./container/iframe-container";
import { WebComponentContainer } from "./container/web-component-container";
import type { RuntimeApi, RuntimeContainer, RuntimeContext, RuntimeMode, RuntimeOptions, ActionRequest, ActionResult } from "./types";

/**
 * RuntimeSDK — 业务系统接入组态的唯一入口。
 *
 * 使用方式（3 行接入）：
 * ```ts
 * const sdk = new RuntimeSDK({ container, mode: "iframe", dataAdapter, onActionRequest });
 * await sdk.init();
 * await sdk.loadPage("page-001", { deviceId: "xxx", token: "yyy" });
 * ```
 */
export class RuntimeSDK implements RuntimeApi {
  private readonly mode: RuntimeMode;
  private readonly hostContainer: RuntimeContainer;
  private readonly options: RuntimeOptions;
  private initialized = false;
  private context: RuntimeContext = {};

  /** BindingEngine 实例，供直接嵌入 Vue 组件（RuntimeRenderer）时使用 */
  readonly bindingEngine: BindingEngine;

  /** ActionExecutor 实例，处理控制动作（含 requireConfirm 拦截） */
  readonly actionExecutor: ActionExecutor;

  private currentPage: PageModel | null = null;
  private unbindPage: (() => void) | null = null;

  constructor(options: RuntimeOptions) {
    this.options = options;
    this.mode = options.mode ?? "iframe";
    this.hostContainer = this.createContainer(this.mode, options.container);

    this.bindingEngine = new BindingEngine();
    this.bindingEngine.setDriver(options.dataAdapter);

    this.actionExecutor = new ActionExecutor();
    this.actionExecutor.setContext({
      driver: options.dataAdapter,
      onActionRequest: options.onActionRequest ? (request) => options.onActionRequest!({ ...request, context: this.context }) : undefined,
    });
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.hostContainer.init();
    this.initialized = true;
  }

  /**
   * 加载画面并启动数据绑定。
   * @param pageOrId - PageModel 对象 或 page id 字符串（需配合 pageLoader）
   * @param context - 运行时上下文（deviceId、token 等）
   */
  async loadPage(pageOrId: PageModel | string, context: Partial<RuntimeContext> = {}): Promise<void> {
    await this.init();
    this.context = { ...this.context, ...context };

    const page = await this.resolvePage(pageOrId);
    this.currentPage = page;

    // Update binding engine with current context globals
    const globals: Record<string, unknown> = { ...this.context };
    this.bindingEngine.setGlobals(globals);

    // Unbind previous page before binding new one
    if (this.unbindPage) {
      this.unbindPage();
      this.unbindPage = null;
    }
    this.bindingEngine.clearStore();
    this.unbindPage = this.bindingEngine.bind(page.elements, page.aliases ?? []);

    // Update action executor context with latest globals
    this.actionExecutor.setContext({
      driver: this.options.dataAdapter,
      globals,
      onActionRequest: this.options.onActionRequest
        ? (request) => this.options.onActionRequest!({ ...request, context: this.context })
        : undefined,
    });

    await this.hostContainer.loadPage(page, this.context);
  }

  /**
   * 热切换设备上下文。无需重新加载画面，仅更新数据驱动和绑定层。
   * 旧设备状态在清除 store 后自动消除，防止串扰。
   */
  async setContext(context: Partial<RuntimeContext>): Promise<void> {
    this.context = { ...this.context, ...context };

    // Clear store to prevent stale data from previous context
    this.bindingEngine.clearStore();

    // Re-sync globals
    const globals: Record<string, unknown> = { ...this.context };
    this.bindingEngine.setGlobals(globals);

    // Re-bind current page with new context if a page is loaded
    if (this.currentPage) {
      if (this.unbindPage) {
        this.unbindPage();
        this.unbindPage = null;
      }
      this.unbindPage = this.bindingEngine.bind(this.currentPage.elements, this.currentPage.aliases ?? []);
    }

    this.actionExecutor.setContext({
      driver: this.options.dataAdapter,
      globals,
      onActionRequest: this.options.onActionRequest
        ? (request) => this.options.onActionRequest!({ ...request, context: this.context })
        : undefined,
    });

    await this.hostContainer.setContext(this.context);
  }

  async dispose(): Promise<void> {
    if (this.unbindPage) {
      this.unbindPage();
      this.unbindPage = null;
    }
    this.bindingEngine.dispose();
    await this.hostContainer.dispose();
    this.initialized = false;
    this.context = {};
    this.currentPage = null;
  }

  private createContainer(mode: RuntimeMode, container: HTMLElement): RuntimeContainer {
    if (mode === "webcomponent") {
      return new WebComponentContainer(container);
    }
    return new IframeContainer(container);
  }

  private async resolvePage(pageOrId: PageModel | string): Promise<PageModel> {
    if (typeof pageOrId !== "string") return pageOrId;
    if (!this.options.pageLoader) {
      throw new Error("[RuntimeSDK] pageLoader is required when loadPage receives a page id.");
    }
    return this.options.pageLoader(pageOrId, this.context);
  }
}
