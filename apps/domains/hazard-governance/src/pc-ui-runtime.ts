import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, markRaw, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName = {
  [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never;
}[keyof PcUiModule];

let pcUi: PcUiModule | undefined;

export async function installHazardGovernancePcUi(ctx: DomainContext): Promise<void> {
  pcUi = await ctx.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

function getPcUi(): PcUiModule {
  if (!pcUi) throw new Error("hazard-governance pcUi Runtime Common 尚未加载");
  return pcUi;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return markRaw(defineAsyncComponent(async () => getPcUi()[name] as Component)) as unknown as PcUiModule[K];
}

export const Alert: PcUiModule["Alert"] = component("Alert");
export const AntModal: PcUiModule["AntModal"] = component("AntModal");
export const Button: PcUiModule["Button"] = component("Button");
export const Card: PcUiModule["Card"] = component("Card");
export const CaretDownOutlined: PcUiModule["CaretDownOutlined"] = component("CaretDownOutlined");
export const CaretRightOutlined: PcUiModule["CaretRightOutlined"] = component("CaretRightOutlined");
export const Cascader: PcUiModule["Cascader"] = component("Cascader");
export const CheckCircleFilled: PcUiModule["CheckCircleFilled"] = component("CheckCircleFilled");
export const CheckCircleOutlined: PcUiModule["CheckCircleOutlined"] = component("CheckCircleOutlined");
export const ClockCircleOutlined: PcUiModule["ClockCircleOutlined"] = component("ClockCircleOutlined");
export const DeleteOutlined: PcUiModule["DeleteOutlined"] = component("DeleteOutlined");
export const Descriptions: PcUiModule["Descriptions"] = component("Descriptions");
export const DescriptionsItem: PcUiModule["DescriptionsItem"] = component("DescriptionsItem");
export const DownOutlined: PcUiModule["DownOutlined"] = component("DownOutlined");
export const EditOutlined: PcUiModule["EditOutlined"] = component("EditOutlined");
export const Form: PcUiModule["Form"] = component("Form");
export const FormItem: PcUiModule["FormItem"] = component("FormItem");
export const HolderOutlined: PcUiModule["HolderOutlined"] = component("HolderOutlined");
export const Image: PcUiModule["Image"] = component("Image");
export const Input: PcUiModule["Input"] = component("Input");
export const InputNumber: PcUiModule["InputNumber"] = component("InputNumber");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const Page: PcUiModule["Page"] = component("Page");
export const PageLayout: PcUiModule["PageLayout"] = component("PageLayout");
export const PlusOutlined: PcUiModule["PlusOutlined"] = component("PlusOutlined");
export const PopOver: PcUiModule["PopOver"] = component("PopOver");
export const Progress: PcUiModule["Progress"] = component("Progress");
export const RangePicker: PcUiModule["RangePicker"] = component("RangePicker");
export const RadioGroup: PcUiModule["RadioGroup"] = component("RadioGroup");
export const Select: PcUiModule["Select"] = component("Select");
export const Slider: PcUiModule["Slider"] = component("Slider");
export const Space: PcUiModule["Space"] = component("Space");
export const Spin: PcUiModule["Spin"] = component("Spin");
export const StarFilled: PcUiModule["StarFilled"] = component("StarFilled");
export const Switch: PcUiModule["Switch"] = component("Switch");
export const TabPane: PcUiModule["TabPane"] = component("TabPane");
export const Tabs: PcUiModule["Tabs"] = component("Tabs");
export const Tag: PcUiModule["Tag"] = component("Tag");
export const Textarea: PcUiModule["Textarea"] = component("Textarea");
export const TimeLine: PcUiModule["TimeLine"] = component("TimeLine");
export const TimeLineItem: PcUiModule["TimeLineItem"] = component("TimeLineItem");
export const WarningFilled: PcUiModule["WarningFilled"] = component("WarningFilled");

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
export const usePcModal: PcUiModule["usePcModal"] = (...args) => getPcUi().usePcModal(...args);
export const usePcTable: PcUiModule["usePcTable"] = (...args) => getPcUi().usePcTable(...args);

export type { ColumnType } from "@g2-platform/pc-ui";
