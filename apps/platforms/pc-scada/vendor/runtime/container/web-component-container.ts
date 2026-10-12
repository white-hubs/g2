import type { PageModel } from "../../core";
import type { RuntimeContainer, RuntimeContext } from "../types";

interface RuntimeHostElement extends HTMLElement {
  loadPage?: (page: PageModel, context: RuntimeContext) => Promise<void> | void;
  setContext?: (context: RuntimeContext) => Promise<void> | void;
}

export class WebComponentContainer implements RuntimeContainer {
  private host: RuntimeHostElement | null = null;

  constructor(private readonly container: HTMLElement) {}

  init() {
    if (this.host) return;
    const host = document.createElement("cube-scada-runtime") as RuntimeHostElement;
    host.style.display = "block";
    host.style.width = "100%";
    host.style.height = "100%";
    this.container.appendChild(host);
    this.host = host;
  }

  async loadPage(page: PageModel, context: RuntimeContext) {
    await this.host?.loadPage?.(page, context);
  }

  async setContext(context: RuntimeContext) {
    await this.host?.setContext?.(context);
  }

  dispose() {
    if (!this.host) return;
    this.host.remove();
    this.host = null;
  }
}
