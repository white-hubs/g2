import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, markRaw, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName = { [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never }[keyof PcUiModule];
let pcUi: PcUiModule | undefined;

export async function installBusinessConfigPcUi(context: DomainContext): Promise<void> {
  pcUi = await context.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

function getPcUi(): PcUiModule {
  if (!pcUi) throw new Error("business-config pcUi Runtime Common 尚未加载");
  return pcUi;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return markRaw(defineAsyncComponent(async () => getPcUi()[name] as Component)) as unknown as PcUiModule[K];
}

export const Button: PcUiModule["Button"] = component("Button");
export const Cascader: PcUiModule["Cascader"] = component("Cascader");
export const Empty: PcUiModule["Empty"] = component("Empty");
export const Form: PcUiModule["Form"] = component("Form");
export const FormItem: PcUiModule["FormItem"] = component("FormItem");
export const Input: PcUiModule["Input"] = component("Input");
export const InputPassword: PcUiModule["InputPassword"] = component("InputPassword");
export const InputNumber: PcUiModule["InputNumber"] = component("InputNumber");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const Page: PcUiModule["Page"] = component("Page");
export const PageLayout: PcUiModule["PageLayout"] = component("PageLayout");
export const PopConfirm: PcUiModule["PopConfirm"] = component("PopConfirm");
export const RadioGroup: PcUiModule["RadioGroup"] = component("RadioGroup");
export const Space: PcUiModule["Space"] = component("Space");
export const Spin: PcUiModule["Spin"] = component("Spin");
export const Select: PcUiModule["Select"] = component("Select");
export const Tabs: PcUiModule["Tabs"] = component("Tabs");
export const TabPane: PcUiModule["TabPane"] = component("TabPane");
export const Upload: PcUiModule["Upload"] = component("Upload");
export const UploadDragger: PcUiModule["UploadDragger"] = component("UploadDragger");
export const Text: PcUiModule["Textarea"] = component("Textarea");
export const message: PcUiModule["message"] = new Proxy({} as PcUiModule["message"], {
  get(_target, key: keyof PcUiModule["message"]) {
    return (...args: unknown[]) => {
      const method = getPcUi().message[key];
      if (typeof method !== "function") throw new Error(`pcUi message.${String(key)} 不可用`);
      return Reflect.apply(method, undefined, args);
    };
  },
});
export const usePcForm: PcUiModule["usePcForm"] = (...args) => getPcUi().usePcForm(...args);
export const usePcTable: PcUiModule["usePcTable"] = (...args) => getPcUi().usePcTable(...args);
export type { FormInstance } from "@g2-platform/pc-ui";
export type { UploadRequestOption } from "@g2-platform/pc-ui";
