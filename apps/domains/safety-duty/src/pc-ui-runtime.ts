import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName = {
  [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never;
}[keyof PcUiModule];

let pcUiModule: PcUiModule | undefined;

export async function installSafetyDutyPcUi(context: DomainContext): Promise<void> {
  pcUiModule = await context.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

function getPcUi(): PcUiModule {
  if (!pcUiModule) throw new Error("pcUi runtime common 尚未加载");
  return pcUiModule;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return defineAsyncComponent(async () => getPcUi()[name] as Component) as unknown as PcUiModule[K];
}

export const AntDatePicker: PcUiModule["AntDatePicker"] = component("AntDatePicker");
export const Button: PcUiModule["Button"] = component("Button");
export const Checkbox: PcUiModule["Checkbox"] = component("Checkbox");
export const CheckboxGroup: PcUiModule["CheckboxGroup"] = component("CheckboxGroup");
export const Drawer: PcUiModule["Drawer"] = component("Drawer");
export const Empty: PcUiModule["Empty"] = component("Empty");
export const Form: PcUiModule["Form"] = component("Form");
export const FormItem: PcUiModule["FormItem"] = component("FormItem");
export const Input: PcUiModule["Input"] = component("Input");
export const InputNumber: PcUiModule["InputNumber"] = component("InputNumber");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const Page: PcUiModule["Page"] = component("Page");
export const PageLayout: PcUiModule["PageLayout"] = component("PageLayout");
export const RadioGroup: PcUiModule["RadioGroup"] = component("RadioGroup");
export const Select: PcUiModule["Select"] = component("Select");
export const SelectOption: PcUiModule["SelectOption"] = component("SelectOption");
export const Space: PcUiModule["Space"] = component("Space");
export const Switch: PcUiModule["Switch"] = component("Switch");
export const Tag: PcUiModule["Tag"] = component("Tag");
export const Textarea: PcUiModule["Textarea"] = component("Textarea");
export const TreeSelect: PcUiModule["TreeSelect"] = component("TreeSelect");
export const Upload: PcUiModule["Upload"] = component("Upload");

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

export function downloadPDF(...args: Parameters<PcUiModule["downloadPDF"]>): ReturnType<PcUiModule["downloadPDF"]> {
  return getPcUi().downloadPDF(...args);
}

export const usePcForm: PcUiModule["usePcForm"] = (...args) => getPcUi().usePcForm(...args);
export const usePcTable: PcUiModule["usePcTable"] = (...args) => getPcUi().usePcTable(...args);
