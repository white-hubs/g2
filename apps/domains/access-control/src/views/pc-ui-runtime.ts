import { defineAsyncComponent, type Component } from "vue";

import { loadAccessControlPcUi } from "../domain-context";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName = {
  [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never;
}[keyof PcUiModule];

export function defineAsyncAccessPcUiComponent<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return defineAsyncComponent(async () => (await loadAccessControlPcUi())[name] as Component) as unknown as PcUiModule[K];
}

export async function callAccessPcUi(name: string, method: string, ...args: unknown[]): Promise<unknown> {
  const module = await loadAccessControlPcUi();
  const target = module[name as keyof PcUiModule] as Record<string, (...values: unknown[]) => unknown>;
  return target[method](...args);
}

export const accessPcUiMessage = {
  error: (text: string) => callAccessPcUi("message", "error", text),
  info: (text: string) => callAccessPcUi("message", "info", text),
  success: (text: string) => callAccessPcUi("message", "success", text),
  warning: (text: string) => callAccessPcUi("message", "warning", text),
};
