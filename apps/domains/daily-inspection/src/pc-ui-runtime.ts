import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName = {
  [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never;
}[keyof PcUiModule];

let pcUiModule: PcUiModule | undefined;

export async function installDailyInspectionPcUi(context: DomainContext): Promise<void> {
  pcUiModule = await context.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

function getPcUi(): PcUiModule {
  if (!pcUiModule) throw new Error("pcUi runtime common 尚未加载");
  return pcUiModule;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return defineAsyncComponent(async () => getPcUi()[name] as Component) as unknown as PcUiModule[K];
}

export const AntModal: PcUiModule["AntModal"] = component("AntModal");
export const Button: PcUiModule["Button"] = component("Button");
export const Cascader: PcUiModule["Cascader"] = component("Cascader");
export const Checkbox: PcUiModule["Checkbox"] = component("Checkbox");
export const CheckboxGroup: PcUiModule["CheckboxGroup"] = component("CheckboxGroup");
export const Col: PcUiModule["Col"] = component("Col");
export const DatePicker: PcUiModule["DatePicker"] = component("DatePicker");
export const Empty: PcUiModule["Empty"] = component("Empty");
export const Form: PcUiModule["Form"] = component("Form");
export const FormItem: PcUiModule["FormItem"] = component("FormItem");
export const Image: PcUiModule["Image"] = component("Image");
export const ImagePreviewGroup: PcUiModule["ImagePreviewGroup"] = component("ImagePreviewGroup");
export const Input: PcUiModule["Input"] = component("Input");
export const InputSearch: PcUiModule["InputSearch"] = component("InputSearch");
export const InputNumber: PcUiModule["InputNumber"] = component("InputNumber");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const Page: PcUiModule["Page"] = component("Page");
export const PageLayout: PcUiModule["PageLayout"] = component("PageLayout");
export const PopConfirm: PcUiModule["PopConfirm"] = component("PopConfirm");
export const PopOver: PcUiModule["PopOver"] = component("PopOver");
export const RadioGroup: PcUiModule["RadioGroup"] = component("RadioGroup");
export const RangePicker: PcUiModule["RangePicker"] = component("RangePicker");
export const Row: PcUiModule["Row"] = component("Row");
export const Select: PcUiModule["Select"] = component("Select");
export const SelectOption: PcUiModule["SelectOption"] = component("SelectOption");
export const Space: PcUiModule["Space"] = component("Space");
export const Spin: PcUiModule["Spin"] = component("Spin");
export const Switch: PcUiModule["Switch"] = component("Switch");
export const TabPane: PcUiModule["TabPane"] = component("TabPane");
export const Step: PcUiModule["Step"] = component("Step");
export const Steps: PcUiModule["Steps"] = component("Steps");
export const Table: PcUiModule["Table"] = component("Table");
export const Tag: PcUiModule["Tag"] = component("Tag");
export const Tabs: PcUiModule["Tabs"] = component("Tabs");
export const Textarea: PcUiModule["Textarea"] = component("Textarea");
export const Tooltip: PcUiModule["Tooltip"] = component("Tooltip");
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

export const usePcForm: PcUiModule["usePcForm"] = (...args) => getPcUi().usePcForm(...args);
export const usePcTable: PcUiModule["usePcTable"] = (...args) => getPcUi().usePcTable(...args);

export type { Dayjs, FormExpose, FormInstance, PcTableColumn } from "@g2-platform/pc-ui";
