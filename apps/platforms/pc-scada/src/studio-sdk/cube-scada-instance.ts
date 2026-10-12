import { DirectScadaPageController } from "./direct-scada-page-handle";
import { ScadaPageController } from "./scada-page-handle";
import type {
  CubeScadaInstance,
  CreateOptions,
  LoadOptions,
  ScadaElementEvent,
  ScadaEventListener,
  ScadaPopupEvent,
  ScadaPopupListener,
  ScadaUnsubscribe,
} from "./types";

function resolveElementAssetBase(options: CreateOptions, viewerBase: string): string | null {
  if (options.elementAssetBase) return options.elementAssetBase;
  if (viewerBase) return viewerBase;
  const apiBase = options.apiBase ?? "/scada/api";

  if (/^https?:\/\//.test(apiBase)) {
    try {
      return new URL(apiBase).origin;
    } catch {
      return null;
    }
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return null;
}

export class CubeScadaRuntime implements CubeScadaInstance {
  private readonly globalListeners = new Set<ScadaEventListener>();
  private readonly popupListeners = new Set<ScadaPopupListener>();

  constructor(
    private readonly viewerBase: string,
    private readonly options: CreateOptions = {},
  ) {}

  load(options: LoadOptions): ScadaPageController | DirectScadaPageController {
    if (this.options.renderMode === "direct") {
      const elementAssetBase = resolveElementAssetBase(this.options, this.viewerBase);
      return new DirectScadaPageController(
        this.options.apiBase ?? "/scada/api",
        options,
        (event) => this.broadcastGlobal(event),
        (event) => this.broadcastPopup(event),
        elementAssetBase,
      );
    }
    return new ScadaPageController(
      this.viewerBase,
      options,
      (event) => this.broadcastGlobal(event),
      (event) => this.broadcastPopup(event),
    );
  }

  on(event: "elementEvent" | "showPopup", listener: ScadaEventListener | ScadaPopupListener): ScadaUnsubscribe {
    if (event === "showPopup") {
      const popupListener = listener as ScadaPopupListener;
      this.popupListeners.add(popupListener);
      return () => {
        this.popupListeners.delete(popupListener);
      };
    }
    const elementListener = listener as ScadaEventListener;
    this.globalListeners.add(elementListener);
    return () => {
      this.globalListeners.delete(elementListener);
    };
  }

  private broadcastGlobal(event: ScadaElementEvent): void {
    for (const listener of this.globalListeners) {
      listener(event);
    }
  }

  private broadcastPopup(event: ScadaPopupEvent): void {
    for (const listener of this.popupListeners) {
      listener(event);
    }
  }
}
