import type { PlatformContext } from "@g2-composition/contract";
import { defineAsyncComponent, markRaw, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName = {
  [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never;
}[keyof PcUiModule];

let pcUi: PcUiModule | undefined;

export async function installPcAlarmPopupPcUi(ctx: PlatformContext): Promise<void> {
  pcUi = await ctx.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

export function getPcAlarmPopupPcUi(): PcUiModule {
  if (!pcUi) throw new Error("pcAlarmPopup pcUi Runtime Common 尚未加载");
  return pcUi;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return markRaw(defineAsyncComponent(async () => getPcAlarmPopupPcUi()[name] as Component)) as unknown as PcUiModule[K];
}

export const Button: PcUiModule["Button"] = component("Button");
export const Space: PcUiModule["Space"] = component("Space");
export const TabPane: PcUiModule["TabPane"] = component("TabPane");
export const Tabs: PcUiModule["Tabs"] = component("Tabs");
export const Tag: PcUiModule["Tag"] = component("Tag");

type PcUiMessage = PcUiModule["message"];
export const message: PcUiMessage = new Proxy({} as PcUiMessage, {
  get(_target, key: keyof PcUiMessage) {
    return (...args: unknown[]) => {
      const method = getPcAlarmPopupPcUi().message[key];
      if (typeof method !== "function") throw new Error(`pcUi message.${String(key)} 不可用`);
      return Reflect.apply(method, undefined, args);
    };
  },
});
