import { ref, type Ref } from "vue";

import { deserializePage, registry, type ElementInstance, type PageModel } from "../core";
import { allBuiltinElements } from "../elements";
import { ActionExecutor, BindingEngine, ManualDriver } from "../engine";
import type { RuntimeElementEvent } from "../runtime";
import { enrichScadaPopupWithSource, scadaPopupFromActionConfig } from "./popup-from-config";
import type {
  LoadOptions,
  ScadaElementEvent,
  ScadaEventListener,
  ScadaPopupEvent,
  ScadaPopupListener,
  ScadaPageHandle,
  ScadaTagDefinition,
  ScadaUnsubscribe,
} from "./types";

interface PageItem {
  id: string;
  name: string;
  project_id?: string | null;
}

interface PageDetail {
  id: string;
  name: string;
  content: string;
}

interface ApiElementItem {
  type: string;
}

interface BuiltinManifest {
  elements?: string[];
}

let builtinsReady = false;

async function setupElements(): Promise<void> {
  if (builtinsReady) return;
  await registry.registerPackage(allBuiltinElements);
  builtinsReady = true;
}

function withBaseUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function loadElementsFromManifest(baseUrl: string): Promise<void> {
  try {
    const manifestResp = await fetch(withBaseUrl(baseUrl, "/builtin-elements/manifest.json"), { cache: "no-store" });
    if (!manifestResp.ok) return;
    const manifest = (await manifestResp.json()) as BuiltinManifest;
    const paths = Array.isArray(manifest.elements) ? manifest.elements : [];
    if (paths.length === 0) return;

    await Promise.all(
      paths.map(async (elementPath) => {
        const resp = await fetch(withBaseUrl(baseUrl, elementPath), { cache: "no-store" });
        if (!resp.ok) return;
        const svg = await resp.text();
        if (!svg.includes("<svg")) return;
        await registry.registerFromSvg(svg);
      }),
    );
  } catch {
    // ignore manifest source failures; API and builtin package are still available
  }
}

async function loadElementsFromApi(apiBase: string): Promise<void> {
  const listResp = await fetch(`${apiBase}/elements/`);
  if (!listResp.ok) return;
  const items = (await listResp.json()) as ApiElementItem[];
  if (!Array.isArray(items) || items.length === 0) return;

  await Promise.all(
    items.map(async (item) => {
      if (!item?.type || registry.has(item.type)) return;
      const svgResp = await fetch(`${apiBase}/elements/${encodeURIComponent(item.type)}/svg`);
      if (!svgResp.ok) return;
      const svgText = await svgResp.text();
      if (!svgText.includes("<svg")) return;
      await registry.registerFromSvg(svgText);
    }),
  );
}

async function fetchPageModel(apiBase: string, options: LoadOptions): Promise<PageModel> {
  const direct = await fetch(`${apiBase}/pages/${encodeURIComponent(options.page)}`);
  if (direct.ok) {
    const detail = (await direct.json()) as PageDetail;
    return deserializePage(detail.content);
  }

  const listResp = await fetch(`${apiBase}/pages/`);
  if (!listResp.ok) throw new Error(`[运行端] 获取画面列表失败: HTTP ${listResp.status}`);
  const list = (await listResp.json()) as PageItem[];

  const found = list.find((item) => {
    if (item.name !== options.page) return false;
    return !options.project || item.project_id === options.project;
  });
  if (!found) throw new Error(`[运行端] 未找到画面: "${options.page}"`);

  const detailResp = await fetch(`${apiBase}/pages/${encodeURIComponent(found.id)}`);
  if (!detailResp.ok) throw new Error(`[运行端] 加载画面失败: HTTP ${detailResp.status}`);
  const detail = (await detailResp.json()) as PageDetail;
  return deserializePage(detail.content);
}

function toScadaEvent(page: PageModel, runtimeEvent: RuntimeElementEvent): ScadaElementEvent | null {
  const eventName = runtimeEvent.eventName as ScadaElementEvent["type"];
  const supportedEvents: ScadaElementEvent["type"][] = ["click", "dblclick", "contextmenu", "mouseenter", "mouseleave"];
  if (!supportedEvents.includes(eventName)) return null;

  const element = runtimeEvent.element;
  return {
    type: eventName,
    pageId: page.id,
    pageName: page.name,
    element: {
      id: element.id,
      type: element.type,
      name: element.label,
      deviceNo: element.deviceId,
      props: element.props ?? {},
    },
    nativeEvent: runtimeEvent.event,
  };
}

export class DirectScadaPageController implements ScadaPageHandle {
  readonly renderMode = "direct" as const;
  readonly loading: Ref<boolean> = ref(false);
  readonly error: Ref<Error | null> = ref(null);
  readonly pageTags: Ref<readonly ScadaTagDefinition[]> = ref([]);
  readonly iframeSrc = "about:blank";
  readonly directPage: Ref<PageModel | null> = ref(null);
  readonly directBindingEngine = new BindingEngine();

  private readonly driver = new ManualDriver();
  private readonly actionExecutor = new ActionExecutor();
  private readonly pageListeners = new Set<ScadaEventListener>();
  private readonly popupListeners = new Set<ScadaPopupListener>();
  private readonly initTags: Record<string, string | number | boolean>;
  private readonly options: LoadOptions;
  private popupActionSource: ElementInstance | null = null;
  private disposed = false;

  constructor(
    private readonly apiBase: string,
    options: LoadOptions,
    private readonly forwardToGlobal: (event: ScadaElementEvent) => void,
    private readonly forwardPopupToGlobal: (event: ScadaPopupEvent) => void,
    private readonly elementAssetBase: string | null = null,
  ) {
    this.options = options;
    this.initTags = options.init?.tags ?? {};
    this.directBindingEngine.setDriver(this.driver);
    this.actionExecutor.setContext({
      driver: this.driver,
      globals: options.init?.vars ?? {},
      showPopup: (config: Record<string, unknown>) => {
        const base = scadaPopupFromActionConfig(config);
        const src = this.popupActionSource;
        this.emitPopupEvent(src ? enrichScadaPopupWithSource(base, src) : base);
      },
    });
    void this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    this.loading.value = true;
    this.error.value = null;
    try {
      await setupElements();
      if (this.elementAssetBase) {
        await loadElementsFromManifest(this.elementAssetBase);
      }
      await loadElementsFromApi(this.apiBase);
      const pageModel = await fetchPageModel(this.apiBase, this.options);
      this.driver.setTagTypes(pageModel.tags ?? []);
      this.directPage.value = pageModel;
      this.pageTags.value = pageModel.tags ?? [];
      for (const [tag, value] of Object.entries(this.initTags)) {
        this.driver.setTagValue(tag, value);
      }
    } catch (error) {
      this.directPage.value = null;
      this.pageTags.value = [];
      this.error.value = error instanceof Error ? error : new Error(String(error));
    } finally {
      this.loading.value = false;
    }
  }

  _attachIframe(_iframe: HTMLIFrameElement): void {}

  _detachIframe(): void {}

  on(event: "elementEvent" | "showPopup", listener: ScadaEventListener | ScadaPopupListener): ScadaUnsubscribe {
    if (event === "showPopup") {
      const popupListener = listener as ScadaPopupListener;
      this.popupListeners.add(popupListener);
      return () => {
        this.popupListeners.delete(popupListener);
      };
    }
    const elementListener = listener as ScadaEventListener;
    this.pageListeners.add(elementListener);
    return () => {
      this.pageListeners.delete(elementListener);
    };
  }

  setTagValue(tag: string, value: string | number | boolean): void {
    this.driver.setTagValue(tag, value);
  }

  _emitElementEvent(event: ScadaElementEvent): void {
    for (const listener of this.pageListeners) {
      listener(event);
    }
    this.forwardToGlobal(event);
  }

  private emitPopupEvent(event: ScadaPopupEvent): void {
    for (const listener of this.popupListeners) {
      listener(event);
    }
    this.forwardPopupToGlobal(event);
  }

  async _handleRuntimeEvent(runtimeEvent: RuntimeElementEvent): Promise<void> {
    const currentPage = this.directPage.value;
    if (!currentPage) return;

    const handlers = (runtimeEvent.element.eventHandlers ?? []).filter((handler) => handler.event === runtimeEvent.eventName);
    const el = runtimeEvent.element;
    for (const handler of handlers) {
      const actions = handler.actions.filter((action) => action.type !== "controlAnimation");
      if (actions.length > 0) {
        this.popupActionSource = el;
        try {
          await this.actionExecutor.execute(actions, {
            element: { id: el.id, type: el.type, label: el.label, deviceId: el.deviceId },
          });
        } finally {
          this.popupActionSource = null;
        }
      }
    }

    const event = toScadaEvent(currentPage, runtimeEvent);
    if (event) {
      this._emitElementEvent(event);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.pageListeners.clear();
    this.popupListeners.clear();
    this.directBindingEngine.dispose();
    this.directPage.value = null;
    this.pageTags.value = [];
    this.error.value = null;
  }
}
