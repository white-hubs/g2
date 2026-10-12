import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, markRaw, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type ComponentName = { [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never }[keyof PcUiModule];
let pcUi: PcUiModule | undefined;

export async function installElectronicPatrolPcUi(ctx: DomainContext): Promise<void> {
  pcUi = await ctx.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}
function getPcUi(): PcUiModule {
  if (!pcUi) throw new Error("electronic-patrol pcUi Runtime Common 尚未加载");
  return pcUi;
}
function component<K extends ComponentName>(name: K): PcUiModule[K] {
  return markRaw(defineAsyncComponent(async () => getPcUi()[name] as Component)) as unknown as PcUiModule[K];
}

export const Alert: PcUiModule["Alert"] = component("Alert");
export const Button: PcUiModule["Button"] = component("Button");
export const Cascader: PcUiModule["Cascader"] = component("Cascader");
export const Checkbox: PcUiModule["Checkbox"] = component("Checkbox");
export const CheckboxGroup: PcUiModule["CheckboxGroup"] = component("CheckboxGroup");
export const DatePicker: PcUiModule["DatePicker"] = component("DatePicker");
export const Descriptions: PcUiModule["Descriptions"] = component("Descriptions");
export const DescriptionsItem: PcUiModule["DescriptionsItem"] = component("DescriptionsItem");
export const Form: PcUiModule["Form"] = component("Form");
export const FormItem: PcUiModule["FormItem"] = component("FormItem");
export const Image: PcUiModule["Image"] = component("Image");
export const Input: PcUiModule["Input"] = component("Input");
export const InputNumber: PcUiModule["InputNumber"] = component("InputNumber");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const Page: PcUiModule["Page"] = component("Page");
export const PageLayout: PcUiModule["PageLayout"] = component("PageLayout");
export const Popconfirm: PcUiModule["Popconfirm"] = component("Popconfirm");
export const RadioGroup: PcUiModule["RadioGroup"] = component("RadioGroup");
export const Select: PcUiModule["Select"] = component("Select");
export const Space: PcUiModule["Space"] = component("Space");
export const Switch: PcUiModule["Switch"] = component("Switch");
export const TabPane: PcUiModule["TabPane"] = component("TabPane");
export const Table: PcUiModule["Table"] = component("Table");
export const Tabs: PcUiModule["Tabs"] = component("Tabs");
export const Tag: PcUiModule["Tag"] = component("Tag");
export const Textarea: PcUiModule["Textarea"] = component("Textarea");
export const TimePicker: PcUiModule["TimePicker"] = component("TimePicker");
export const Upload: PcUiModule["Upload"] = component("Upload");
export const usePcForm: PcUiModule["usePcForm"] = (...args) => getPcUi().usePcForm(...args);
export const usePcTable: PcUiModule["usePcTable"] = (...args) => getPcUi().usePcTable(...args);
export const message: PcUiModule["message"] = new Proxy({} as PcUiModule["message"], {
  get(_target, key: keyof PcUiModule["message"]) {
    return (...args: unknown[]) => Reflect.apply(getPcUi().message[key] as (...values: unknown[]) => unknown, undefined, args);
  },
});
export type { FormInstance, PcFormSchemaProp, PcTableColumn } from "@g2-platform/pc-ui";
