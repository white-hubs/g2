import type { PlatformContext } from "@g2-composition/contract";
import { defineAsyncComponent, markRaw, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName = {
  [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never;
}[keyof PcUiModule];

let pcUi: PcUiModule | undefined;

export async function installPcAuthPcUi(ctx: PlatformContext): Promise<void> {
  pcUi = await ctx.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

export function getPcAuthPcUi(): PcUiModule {
  if (!pcUi) throw new Error("pcAuth pcUi Runtime Common 尚未加载");
  return pcUi;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return markRaw(defineAsyncComponent(async () => getPcAuthPcUi()[name] as Component)) as unknown as PcUiModule[K];
}

export const Button: PcUiModule["Button"] = component("Button");
export const Checkbox: PcUiModule["Checkbox"] = component("Checkbox");
export const Form: PcUiModule["Form"] = component("Form");
export const FormItem: PcUiModule["FormItem"] = component("FormItem");
export const Input: PcUiModule["Input"] = component("Input");
export const InputPassword: PcUiModule["InputPassword"] = component("InputPassword");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const Spin: PcUiModule["Spin"] = component("Spin");

type PcUiMessage = PcUiModule["message"];
export const message: PcUiMessage = new Proxy({} as PcUiMessage, {
  get(_target, key: keyof PcUiMessage) {
    return (...args: unknown[]) => {
      const method = getPcAuthPcUi().message[key];
      if (typeof method !== "function") throw new Error(`pcUi message.${String(key)} 不可用`);
      return Reflect.apply(method, undefined, args);
    };
  },
});
