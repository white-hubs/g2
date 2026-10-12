import type { PageModel } from "../../../vendor/core";
import type { RuntimeContainer, RuntimeContext } from "../types";

interface IframePayload {
  page?: PageModel;
  context?: RuntimeContext;
}

export class IframeContainer implements RuntimeContainer {
  private iframe: HTMLIFrameElement | null = null;

  constructor(private readonly hostContainer: HTMLElement) {}

  init() {
    if (this.iframe) return;
    const iframe = document.createElement("iframe");
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "0";
    iframe.title = "Cube SCADA Runtime";
    this.hostContainer.appendChild(iframe);
    this.iframe = iframe;
  }

  loadPage(page: PageModel, context: RuntimeContext) {
    this.postMessage("loadPage", { page, context });
  }

  setContext(context: RuntimeContext) {
    this.postMessage("setContext", { context });
  }

  dispose() {
    if (!this.iframe) return;
    this.iframe.remove();
    this.iframe = null;
  }

  private postMessage(type: string, payload: IframePayload) {
    if (!this.iframe?.contentWindow) return;
    this.iframe.contentWindow.postMessage({ type, payload }, "*");
  }
}
