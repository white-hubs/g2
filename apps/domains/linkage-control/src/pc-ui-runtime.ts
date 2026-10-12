import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, markRaw, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type ComponentName = { [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never }[keyof PcUiModule];
let pcUi: PcUiModule | undefined;

export async function installLinkageControlPcUi(context: DomainContext): Promise<void> {
  pcUi = await context.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

function getPcUi(): PcUiModule {
  if (!pcUi) throw new Error("linkage-control pcUi Runtime Common 尚未加载");
  return pcUi;
}

function component<K extends ComponentName>(name: K): PcUiModule[K] {
  return markRaw(defineAsyncComponent(async () => getPcUi()[name] as Component)) as unknown as PcUiModule[K];
}

export const Button: PcUiModule["Button"] = component("Button");
export const CheckboxGroup: PcUiModule["CheckboxGroup"] = component("CheckboxGroup");
export const Form: PcUiModule["Form"] = component("Form");
export const FormItem: PcUiModule["FormItem"] = component("FormItem");
export const Input: PcUiModule["Input"] = component("Input");
export const InputNumber: PcUiModule["InputNumber"] = component("InputNumber");
export const DatePicker: PcUiModule["DatePicker"] = component("DatePicker");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const Page: PcUiModule["Page"] = component("Page");
export const PageLayout: PcUiModule["PageLayout"] = component("PageLayout");
export const PopConfirm: PcUiModule["PopConfirm"] = component("PopConfirm");
export const RangePicker: PcUiModule["RangePicker"] = component("RangePicker");
export const Select: PcUiModule["Select"] = component("Select");
export const Space: PcUiModule["Space"] = component("Space");
export const Switch: PcUiModule["Switch"] = component("Switch");
export const TabPane: PcUiModule["TabPane"] = component("TabPane");
export const Tabs: PcUiModule["Tabs"] = component("Tabs");
export const Textarea: PcUiModule["Textarea"] = component("Textarea");
export const message: PcUiModule["message"] = new Proxy({} as PcUiModule["message"], {
  get(_target, key: keyof PcUiModule["message"]) {
    return (...args: unknown[]) => Reflect.apply(getPcUi().message[key] as (...values: unknown[]) => unknown, undefined, args);
  },
});
export const usePcForm: PcUiModule["usePcForm"] = (...args) => getPcUi().usePcForm(...args);
export const usePcTable: PcUiModule["usePcTable"] = (...args) => getPcUi().usePcTable(...args);
