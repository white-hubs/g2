import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, markRaw, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName = {
  [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never;
}[keyof PcUiModule];

let pcUi: PcUiModule | undefined;

export async function installKnowledgeDocumentPcUi(ctx: DomainContext): Promise<void> {
  pcUi = await ctx.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

function getPcUi(): PcUiModule {
  if (!pcUi) throw new Error("knowledge-document pcUi Runtime Common 尚未加载");
  return pcUi;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return markRaw(defineAsyncComponent(async () => getPcUi()[name] as Component)) as unknown as PcUiModule[K];
}

export const Button: PcUiModule["Button"] = component("Button");
export const Form: PcUiModule["Form"] = component("Form");
export const FormItem: PcUiModule["FormItem"] = component("FormItem");
export const Image: PcUiModule["Image"] = component("Image");
export const Input: PcUiModule["Input"] = component("Input");
export const InputSearch: PcUiModule["InputSearch"] = component("InputSearch");
export const InputNumber: PcUiModule["InputNumber"] = component("InputNumber");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const Page: PcUiModule["Page"] = component("Page");
export const PageLayout: PcUiModule["PageLayout"] = component("PageLayout");
export const PopConfirm: PcUiModule["PopConfirm"] = component("PopConfirm");
export const Select: PcUiModule["Select"] = component("Select");
export const Space: PcUiModule["Space"] = component("Space");
export const Step: PcUiModule["Step"] = component("Step");
export const Steps: PcUiModule["Steps"] = component("Steps");
export const Textarea: PcUiModule["Textarea"] = component("Textarea");
export const Tree: PcUiModule["Tree"] = component("Tree");
export const TreeSelect: PcUiModule["TreeSelect"] = component("TreeSelect");
export const Upload: PcUiModule["Upload"] = component("Upload");
export const UploadDragger: PcUiModule["UploadDragger"] = component("UploadDragger");
export const CloudUploadOutlined: PcUiModule["CloudUploadOutlined"] = component("CloudUploadOutlined");
export const DeleteOutlined: PcUiModule["DeleteOutlined"] = component("DeleteOutlined");
export const usePcForm: PcUiModule["usePcForm"] = (...args) => getPcUi().usePcForm(...args);
export const usePcTable: PcUiModule["usePcTable"] = (...args) => getPcUi().usePcTable(...args);
export const message: PcUiModule["message"] = new Proxy({} as PcUiModule["message"], {
  get(_target, key: keyof PcUiModule["message"]) {
    return (...args: unknown[]) => {
      const method = getPcUi().message[key];
      if (typeof method !== "function") throw new Error(`pcUi message.${String(key)} 不可用`);
      return Reflect.apply(method, undefined, args);
    };
  },
});

export type { FormInstance, UploadRequestOption } from "@g2-platform/pc-ui";
