import type { EventBus } from "@g2-composition/contract";
/** 与 `@g2-shell/pc` 约定同一事件名（壳不静态依赖 pc-ui）。 */
export declare const SHELL_NAVIGATE_ERROR_EVENT = "shell:navigate-error";
export interface NavigateErrorHandlerDeps {
    messageError: (content: string) => void;
}
export declare function installNavigateErrorHandler(bus: EventBus, deps: NavigateErrorHandlerDeps): () => void;
//# sourceMappingURL=navigate-error-handler.d.ts.map