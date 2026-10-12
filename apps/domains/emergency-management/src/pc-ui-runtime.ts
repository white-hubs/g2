import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName = {
  [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never;
}[keyof PcUiModule];

let pcUiModule: PcUiModule | undefined;

export async function installEmergencyManagementPcUi(context: DomainContext): Promise<void> {
  pcUiModule = await context.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

function getPcUi(): PcUiModule {
  if (!pcUiModule) throw new Error("pcUi runtime common 尚未加载");
  return pcUiModule;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return defineAsyncComponent(async () => getPcUi()[name] as Component) as unknown as PcUiModule[K];
}

export const Button: PcUiModule["Button"] = component("Button");
export const Checkbox: PcUiModule["Checkbox"] = component("Checkbox");
export const CheckboxGroup: PcUiModule["CheckboxGroup"] = component("CheckboxGroup");
export const DatePicker: PcUiModule["DatePicker"] = component("DatePicker");
export const Form: PcUiModule["Form"] = component("Form");
export const FormItem: PcUiModule["FormItem"] = component("FormItem");
export const Image: PcUiModule["Image"] = component("Image");
export const Input: PcUiModule["Input"] = component("Input");
export const InputNumber: PcUiModule["InputNumber"] = component("InputNumber");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const Page: PcUiModule["Page"] = component("Page");
export const PageLayout: PcUiModule["PageLayout"] = component("PageLayout");
export const PopConfirm: PcUiModule["PopConfirm"] = component("PopConfirm");
export const PopOver: PcUiModule["PopOver"] = component("PopOver");
export const Select: PcUiModule["Select"] = component("Select");
export const Step: PcUiModule["Step"] = component("Step");
export const Steps: PcUiModule["Steps"] = component("Steps");
export const TabPane: PcUiModule["TabPane"] = component("TabPane");
export const Table: PcUiModule["Table"] = component("Table");
export const Tabs: PcUiModule["Tabs"] = component("Tabs");
export const Tag: PcUiModule["Tag"] = component("Tag");
export const Textarea: PcUiModule["Textarea"] = component("Textarea");

export const message: PcUiModule["message"] = new Proxy({} as PcUiModule["message"], {
  get(_target, key: keyof PcUiModule["message"]) {
    return (...args: unknown[]) => {
      const method = getPcUi().message[key];
      if (typeof method !== "function") throw new Error(`pcUi message.${String(key)} 不可用`);
      return Reflect.apply(method, undefined, args);
    };
  },
});

export function getDayjs(): PcUiModule["dayjs"] {
  return getPcUi().dayjs;
}
export const usePcModal: PcUiModule["usePcModal"] = (...args) => getPcUi().usePcModal(...args);
export const usePcTable: PcUiModule["usePcTable"] = (...args) => getPcUi().usePcTable(...args);
