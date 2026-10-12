import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, markRaw, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName = {
  [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never;
}[keyof PcUiModule];

let pcUi: PcUiModule | undefined;

export async function installRiskGradedControlPcUi(ctx: DomainContext): Promise<void> {
  pcUi = await ctx.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

function getPcUi(): PcUiModule {
  if (!pcUi) throw new Error("risk-graded-control pcUi Runtime Common 尚未加载");
  return pcUi;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return markRaw(defineAsyncComponent(async () => getPcUi()[name] as Component)) as unknown as PcUiModule[K];
}

export const Alert: PcUiModule["Alert"] = component("Alert");
export const AntModal: PcUiModule["AntModal"] = component("AntModal");
export const Button: PcUiModule["Button"] = component("Button");
export const Card: PcUiModule["Card"] = component("Card");
export const CheckboxGroup: PcUiModule["CheckboxGroup"] = component("CheckboxGroup");
export const Col: PcUiModule["Col"] = component("Col");
export const DatePicker: PcUiModule["DatePicker"] = component("DatePicker");
export const Descriptions: PcUiModule["Descriptions"] = component("Descriptions");
export const DescriptionsItem: PcUiModule["DescriptionsItem"] = component("DescriptionsItem");
export const Drawer: PcUiModule["Drawer"] = component("Drawer");
export const Empty: PcUiModule["Empty"] = component("Empty");
export const Form: PcUiModule["Form"] = component("Form");
export const FormItem: PcUiModule["FormItem"] = component("FormItem");
export const Image: PcUiModule["Image"] = component("Image");
export const Input: PcUiModule["Input"] = component("Input");
export const InputNumber: PcUiModule["InputNumber"] = component("InputNumber");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const Page: PcUiModule["Page"] = component("Page");
export const PageLayout: PcUiModule["PageLayout"] = component("PageLayout");
export const PopConfirm: PcUiModule["PopConfirm"] = component("PopConfirm");
export const Progress: PcUiModule["Progress"] = component("Progress");
export const Radio: PcUiModule["Radio"] = component("Radio");
export const RadioGroup: PcUiModule["RadioGroup"] = component("RadioGroup");
export const RangePicker: PcUiModule["RangePicker"] = component("RangePicker");
export const Result: PcUiModule["Result"] = component("Result");
export const Row: PcUiModule["Row"] = component("Row");
export const Select: PcUiModule["Select"] = component("Select");
export const SelectOption: PcUiModule["SelectOption"] = component("SelectOption");
export const Space: PcUiModule["Space"] = component("Space");
export const Spin: PcUiModule["Spin"] = component("Spin");
export const Switch: PcUiModule["Switch"] = component("Switch");
export const Table: PcUiModule["Table"] = component("Table");
export const Tag: PcUiModule["Tag"] = component("Tag");
export const Textarea: PcUiModule["Textarea"] = component("Textarea");
export const Tooltip: PcUiModule["Tooltip"] = component("Tooltip");
export const TreeSelect: PcUiModule["TreeSelect"] = component("TreeSelect");
export const Upload: PcUiModule["Upload"] = component("Upload");
export const ZhConfigProvider: PcUiModule["ZhConfigProvider"] = component("ZhConfigProvider");

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

export type { ColumnType, Dayjs, FormExpose, FormRule, UploadChangeParam, UploadFile, UploadRequestOption } from "@g2-platform/pc-ui";
