import { ref, type Ref } from "vue";

import { scadaPopupFromActionConfig } from "./popup-from-config";
import type {
  ScadaElementEvent,
  ScadaEventListener,
  ScadaPopupEvent,
  ScadaPopupListener,
  ScadaPageHandle,
  ScadaTagDefinition,
  ScadaUnsubscribe,
  LoadOptions,
} from "./types";

type PostMsg = { type: string; [key: string]: unknown };

export class ScadaPageController implements ScadaPageHandle {
  readonly renderMode = "iframe" as const;
  readonly loading: Ref<boolean> = ref(true);
  readonly error: Ref<Error | null> = ref(null);
  readonly pageTags: Ref<readonly ScadaTagDefinition[]> = ref([]);
  readonly iframeSrc: string;

  private readonly pageListeners = new Set<ScadaEventListener>();
  private readonly popupListeners = new Set<ScadaPopupListener>();
  private readonly forwardToGlobal: (event: ScadaElementEvent) => void;
  private readonly forwardPopupToGlobal: (event: ScadaPopupEvent) => void;
  private readonly initTags: Record<string, string | number | boolean>;

  private iframe: HTMLIFrameElement | null = null;
  private messageListener: ((e: MessageEvent) => void) | null = null;
  private disposed = false;

  constructor(
    viewerBase: string,
    options: LoadOptions,
    forwardToGlobal: (event: ScadaElementEvent) => void,
    forwardPopupToGlobal: (event: ScadaPopupEvent) => void,
  ) {
    this.forwardToGlobal = forwardToGlobal;
    this.forwardPopupToGlobal = forwardPopupToGlobal;
    this.initTags = options.init?.tags ?? {};

    const params = new URLSearchParams();
    params.set("page", options.page);
    if (options.project) params.set("project", options.project);
    if (options.init?.vars && Object.keys(options.init.vars).length > 0) {
      params.set("vars", JSON.stringify(options.init.vars));
    }
    this.iframeSrc = `${viewerBase}/viewer?${params.toString()}`;
  }

  _attachIframe(iframe: HTMLIFrameElement): void {
    this.iframe = iframe;

    // Optimistically clear loading — the iframe renders its own loading state.
    // We no longer rely on scada:ready for showing/hiding the host overlay.
    this.loading.value = false;

    this.messageListener = (e: MessageEvent) => {
      const data = e.data as PostMsg | null;
      // Accept only our protocol messages (scada: prefix).
      // We intentionally do NOT check e.source here because cross-origin
      // WindowProxy comparisons are unreliable across browsers.
      if (!data?.type || !String(data.type).startsWith("scada:")) return;

      if (data.type === "scada:ready") {
        // Capture the page's tag definitions for host-side inspection
        const tags = data.tags as ScadaTagDefinition[] | undefined;
        if (Array.isArray(tags)) this.pageTags.value = tags;

        // Push initial tag values into the viewer after it signals readiness.
        for (const [tag, value] of Object.entries(this.initTags)) {
          this.postToIframe({ type: "scada:setTagValue", tag, value });
        }
      } else if (data.type === "scada:error") {
        this.error.value = new Error(String(data.message ?? "Viewer error"));
      } else if (data.type === "scada:elementEvent") {
        const event = data.event as ScadaElementEvent | undefined;
        if (event) this._emitElementEvent(event);
      } else if (data.type === "scada:showPopup") {
        const popup = data.popup as ScadaPopupEvent | undefined;
        if (popup && typeof popup === "object" && typeof (popup as ScadaPopupEvent).title === "string") {
          this.emitPopupEvent(popup);
        } else {
          const raw = (data.config ?? {}) as Record<string, unknown>;
          this.emitPopupEvent(scadaPopupFromActionConfig(raw));
        }
      }
    };

    window.addEventListener("message", this.messageListener);
  }

  _detachIframe(): void {
    if (this.messageListener) {
      window.removeEventListener("message", this.messageListener);
      this.messageListener = null;
    }
    this.iframe = null;
    this.loading.value = true;
    this.error.value = null;
    this.pageTags.value = [];
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
    this.pageListeners.add(elementListener);
    return () => {
      this.pageListeners.delete(elementListener);
    };
  }

  setTagValue(tag: string, value: string | number | boolean): void {
    this.postToIframe({ type: "scada:setTagValue", tag, value });
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

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this._detachIframe();
    this.pageListeners.clear();
    this.popupListeners.clear();
  }

  private postToIframe(msg: PostMsg): void {
    this.iframe?.contentWindow?.postMessage(msg, "*");
  }
}
