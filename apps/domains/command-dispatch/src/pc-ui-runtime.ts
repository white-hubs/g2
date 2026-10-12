import type { DomainContext } from "@g2-composition/contract";
import type { PcUiRuntime } from "@g2-platform/pc-ui/types";
import { defineAsyncComponent, type Component } from "vue";

type PcUiModule = PcUiRuntime;
type PcUiComponentName = {
  [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never;
}[keyof PcUiModule];

let pcUiModule: PcUiModule | undefined;

export async function installCommandDispatchPcUi(ctx: DomainContext): Promise<void> {
  pcUiModule = await ctx.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

export function getCommandDispatchPcUi(): PcUiModule {
  if (!pcUiModule) {
    throw new Error("pcUi runtime common 尚未加载");
  }
  return pcUiModule;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return defineAsyncComponent(async () => getCommandDispatchPcUi()[name] as Component) as unknown as PcUiModule[K];
}

export const Alert: PcUiModule["Alert"] = component("Alert");
export const Button: PcUiModule["Button"] = component("Button");
export const Empty: PcUiModule["Empty"] = component("Empty");
export const Form: PcUiModule["Form"] = component("Form");
export const FormItem: PcUiModule["FormItem"] = component("FormItem");
export const Input: PcUiModule["Input"] = component("Input");
export const InputNumber: PcUiModule["InputNumber"] = component("InputNumber");
export const InputPassword: PcUiModule["InputPassword"] = component("InputPassword");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const Pagination: PcUiModule["Pagination"] = component("Pagination");
export const Popconfirm: PcUiModule["Popconfirm"] = component("Popconfirm");
export const Popover: PcUiModule["Popover"] = component("Popover");
export const RangePicker: PcUiModule["RangePicker"] = component("RangePicker");
export const Select: PcUiModule["Select"] = component("Select");
export const Slider: PcUiModule["Slider"] = component("Slider");
export const Spin: PcUiModule["Spin"] = component("Spin");
export const Switch: PcUiModule["Switch"] = component("Switch");
export const Table: PcUiModule["Table"] = component("Table");
export const TreeSelect: PcUiModule["TreeSelect"] = component("TreeSelect");
export const Upload: PcUiModule["Upload"] = component("Upload");

type PcUiMessage = PcUiModule["message"];
export const message: PcUiMessage = new Proxy({} as PcUiMessage, {
  get(_target, key: keyof PcUiMessage) {
    return (...args: unknown[]) => {
      const method = getCommandDispatchPcUi().message[key];
      if (typeof method !== "function") throw new Error(`pcUi message.${String(key)} 不可用`);
      return Reflect.apply(method, undefined, args);
    };
  },
});
