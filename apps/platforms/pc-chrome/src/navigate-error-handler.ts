import type { EventBus } from "@g2-composition/contract";

/** 与 `@g2-shell/pc` 约定同一事件名（壳不静态依赖 pc-ui）。 */
export const SHELL_NAVIGATE_ERROR_EVENT = "shell:navigate-error";

export interface NavigateErrorHandlerDeps {
  messageError: (content: string) => void;
}

function messageFromPayload(payload: unknown): string | undefined {
  if (payload === null || typeof payload !== "object") {
    return undefined;
  }
  const message = (payload as { message?: unknown }).message;
  return typeof message === "string" && message.trim() ? message.trim() : undefined;
}

export function installNavigateErrorHandler(bus: EventBus, deps: NavigateErrorHandlerDeps): () => void {
  return bus.subscribe(SHELL_NAVIGATE_ERROR_EVENT, (payload) => {
    const message = messageFromPayload(payload);
    if (message) {
      deps.messageError(message);
    }
  });
}
