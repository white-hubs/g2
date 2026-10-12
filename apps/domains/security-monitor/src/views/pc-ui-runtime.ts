import { defineAsyncComponent, type Component } from "vue";

import { getSecurityMonitorContext } from "../domain-context";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName = {
  [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never;
}[keyof PcUiModule];

/**
 * 唯一的 pcUi 域侧入口。它只使用 Shell 已预检的 runtime-common Remote，
 * 因而页面不会重新引入 workspace 的 pcUi fallback。
 */
export function loadSecurityPcUi(): Promise<PcUiModule> {
  return getSecurityMonitorContext().loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

export function defineAsyncSecurityPcUiComponent<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return defineAsyncComponent(async () => (await loadSecurityPcUi())[name] as Component) as unknown as PcUiModule[K];
}

export function defineAsyncSecurityPcUiComponentMember<K extends keyof PcUiModule, M extends keyof PcUiModule[K]>(
  name: K,
  member: M,
): PcUiModule[K][M] {
  return defineAsyncComponent(
    async () => ((await loadSecurityPcUi())[name] as Record<keyof PcUiModule[K], Component>)[member],
  ) as unknown as PcUiModule[K][M];
}

export async function callSecurityPcUi(name: string, method: string, ...args: unknown[]): Promise<unknown> {
  const module = await loadSecurityPcUi();
  const target = (module as unknown as Record<string, Record<string, (...values: unknown[]) => unknown>>)[name];
  return target[method](...args);
}

export const securityPcUiMessage = {
  error: (text: string) => callSecurityPcUi("message", "error", text),
  info: (text: string) => callSecurityPcUi("message", "info", text),
  success: (text: string) => callSecurityPcUi("message", "success", text),
  warning: (text: string) => callSecurityPcUi("message", "warning", text),
};

export async function showSecurityPcUiMessage(level: "error" | "info" | "success" | "warning", text: string): Promise<void> {
  const module = await loadSecurityPcUi();
  module.message[level](text);
}

export async function showSecurityPcUiError(error: unknown, fallback: string): Promise<void> {
  await showSecurityPcUiMessage("error", error instanceof Error ? error.message : fallback);
}
