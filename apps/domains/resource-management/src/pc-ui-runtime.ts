import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, markRaw, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type ComponentName = { [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never }[keyof PcUiModule];
let pcUi: PcUiModule | undefined;

export async function installResourceManagementPcUi(ctx: DomainContext): Promise<void> {
  pcUi = await ctx.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}
function getPcUi(): PcUiModule {
  if (!pcUi) throw new Error("resource-management pcUi Runtime Common 尚未加载");
  return pcUi;
}
function component<K extends ComponentName>(name: K): PcUiModule[K] {
  return markRaw(defineAsyncComponent(async () => getPcUi()[name] as Component)) as unknown as PcUiModule[K];
}

export const Button: PcUiModule["Button"] = component("Button");
export const Form: PcUiModule["Form"] = component("Form");
export const FormItem: PcUiModule["FormItem"] = component("FormItem");
export const Image: PcUiModule["Image"] = component("Image");
export const ImagePreviewGroup: PcUiModule["ImagePreviewGroup"] = component("ImagePreviewGroup");
export const Input: PcUiModule["Input"] = component("Input");
export const InputNumber: PcUiModule["InputNumber"] = component("InputNumber");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const Page: PcUiModule["Page"] = component("Page");
export const PageLayout: PcUiModule["PageLayout"] = component("PageLayout");
export const PopConfirm: PcUiModule["PopConfirm"] = component("PopConfirm");
export const PopOver: PcUiModule["PopOver"] = component("PopOver");
export const RadioGroup: PcUiModule["RadioGroup"] = component("RadioGroup");
export const Select: PcUiModule["Select"] = component("Select");
export const Spin: PcUiModule["Spin"] = component("Spin");
export const Tabs: PcUiModule["Tabs"] = component("Tabs");
export const TabPane: PcUiModule["TabPane"] = component("TabPane");
export const Tag: PcUiModule["Tag"] = component("Tag");
export const Textarea: PcUiModule["Textarea"] = component("Textarea");
export const Tree: PcUiModule["Tree"] = component("Tree");
export const Upload: PcUiModule["Upload"] = component("Upload");
export const UploadDragger: PcUiModule["UploadDragger"] = component("UploadDragger");
export const usePcForm: PcUiModule["usePcForm"] = (...args) => getPcUi().usePcForm(...args);
export const usePcTable: PcUiModule["usePcTable"] = (...args) => getPcUi().usePcTable(...args);
export const message: PcUiModule["message"] = new Proxy({} as PcUiModule["message"], {
  get(_target, key: keyof PcUiModule["message"]) {
    return (...args: unknown[]) => Reflect.apply(getPcUi().message[key] as (...values: unknown[]) => unknown, undefined, args);
  },
});
export const dayjs = new Proxy((...args: Parameters<PcUiModule["dayjs"]>) => getPcUi().dayjs(...args), {
  get(_target, key: keyof PcUiModule["dayjs"]) {
    const value = getPcUi().dayjs[key];
    return typeof value === "function" ? (...args: unknown[]) => Reflect.apply(value, getPcUi().dayjs, args) : value;
  },
}) as PcUiModule["dayjs"];
export type { PcTableColumn, UploadFile } from "@g2-platform/pc-ui";
