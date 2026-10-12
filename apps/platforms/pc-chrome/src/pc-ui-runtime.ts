import type { PlatformContext } from "@g2-composition/contract";
import { defineAsyncComponent, markRaw, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName = {
  [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never;
}[keyof PcUiModule];

let pcUi: PcUiModule | undefined;

export async function installPcChromePcUi(ctx: PlatformContext): Promise<void> {
  pcUi = await ctx.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

export function getPcChromePcUi(): PcUiModule {
  if (!pcUi) throw new Error("pcChrome pcUi Runtime Common 尚未加载");
  return pcUi;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return markRaw(defineAsyncComponent(async () => getPcChromePcUi()[name] as Component)) as unknown as PcUiModule[K];
}

export const Avatar: PcUiModule["Avatar"] = component("Avatar");
export const Button: PcUiModule["Button"] = component("Button");
export const ConfigProvider: PcUiModule["ConfigProvider"] = component("ConfigProvider");
export const Dropdown: PcUiModule["Dropdown"] = component("Dropdown");
export const Input: PcUiModule["Input"] = component("Input");
export const Menu: PcUiModule["Menu"] = component("Menu");
export const MenuItem: PcUiModule["MenuItem"] = component("MenuItem");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const SubMenu: PcUiModule["SubMenu"] = component("SubMenu");
export const TabPane: PcUiModule["TabPane"] = component("TabPane");
export const Tabs: PcUiModule["Tabs"] = component("Tabs");

type PcUiMessage = PcUiModule["message"];
export const message: PcUiMessage = new Proxy({} as PcUiMessage, {
  get(_target, key: keyof PcUiMessage) {
    return (...args: unknown[]) => {
      const method = getPcChromePcUi().message[key];
      if (typeof method !== "function") throw new Error(`pcUi message.${String(key)} 不可用`);
      return Reflect.apply(method, undefined, args);
    };
  },
});

// Stable cross-version keys from pc-ui/src/skin-primary.ts; importing that module
// statically would pull the local pc-ui barrel back into the pcChrome artifact.
export const LEGACY_SKIN_COLOR_KEY = "skinColor";
export const MF_ROOT_CHANGE_SKIN_EVENT = "mf-root-change-skin";
export const SKIN_STORAGE_KEY = "g2-pc-skin";
