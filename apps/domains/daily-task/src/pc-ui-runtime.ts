import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, markRaw, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName =
  | "AntModal"
  | "Button"
  | "Checkbox"
  | "CheckboxGroup"
  | "Col"
  | "DatePicker"
  | "Empty"
  | "Form"
  | "FormItem"
  | "Image"
  | "ImagePreviewGroup"
  | "Input"
  | "InputNumber"
  | "Modal"
  | "Page"
  | "PageLayout"
  | "PopConfirm"
  | "PopOver"
  | "Radio"
  | "Row"
  | "Select"
  | "Space"
  | "Steps"
  | "Switch"
  | "TabPane"
  | "Table"
  | "Tabs"
  | "Textarea";

let pcUi: PcUiModule | undefined;

export async function installDailyTaskPcUi(ctx: DomainContext): Promise<void> {
  pcUi = await ctx.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

function getPcUi(): PcUiModule {
  if (!pcUi) throw new Error("daily-task pcUi Runtime Common is not installed");
  return pcUi;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return markRaw(defineAsyncComponent(async () => getPcUi()[name] as Component)) as unknown as PcUiModule[K];
}

const runtimeAntModal: PcUiModule["AntModal"] = component("AntModal");
const runtimeButton: PcUiModule["Button"] = component("Button");
const runtimeCheckbox: PcUiModule["Checkbox"] = component("Checkbox");
const runtimeCheckboxGroup: PcUiModule["CheckboxGroup"] = component("CheckboxGroup");
const runtimeCol: PcUiModule["Col"] = component("Col");
const runtimeDatePicker: PcUiModule["DatePicker"] = component("DatePicker");
const runtimeEmpty: PcUiModule["Empty"] = component("Empty");
const runtimeForm: PcUiModule["Form"] = component("Form");
const runtimeFormItem: PcUiModule["FormItem"] = component("FormItem");
const runtimeImage: PcUiModule["Image"] = component("Image");
const runtimeImagePreviewGroup: PcUiModule["ImagePreviewGroup"] = component("ImagePreviewGroup");
const runtimeInput: PcUiModule["Input"] = component("Input");
const runtimeInputNumber: PcUiModule["InputNumber"] = component("InputNumber");
const runtimeModal: PcUiModule["Modal"] = component("Modal");
const runtimePage: PcUiModule["Page"] = component("Page");
const runtimePageLayout: PcUiModule["PageLayout"] = component("PageLayout");
const runtimePopConfirm: PcUiModule["PopConfirm"] = component("PopConfirm");
const runtimePopOver: PcUiModule["PopOver"] = component("PopOver");
const runtimeRadio: PcUiModule["Radio"] = component("Radio");
const runtimeRow: PcUiModule["Row"] = component("Row");
const runtimeSelect: PcUiModule["Select"] = component("Select");
const runtimeSpace: PcUiModule["Space"] = component("Space");
const runtimeSteps: PcUiModule["Steps"] = component("Steps");
const runtimeSwitch: PcUiModule["Switch"] = component("Switch");
const runtimeTabPane: PcUiModule["TabPane"] = component("TabPane");
const runtimeTable: PcUiModule["Table"] = component("Table");
const runtimeTabs: PcUiModule["Tabs"] = component("Tabs");
const runtimeTextarea: PcUiModule["Textarea"] = component("Textarea");

export {
  runtimeAntModal as AntModal,
  runtimeButton as Button,
  runtimeCheckbox as Checkbox,
  runtimeCheckboxGroup as CheckboxGroup,
  runtimeCol as Col,
  runtimeDatePicker as DatePicker,
  runtimeEmpty as Empty,
  runtimeForm as Form,
  runtimeFormItem as FormItem,
  runtimeImage as Image,
  runtimeImagePreviewGroup as ImagePreviewGroup,
  runtimeInput as Input,
  runtimeInputNumber as InputNumber,
  runtimeModal as Modal,
  runtimePage as Page,
  runtimePageLayout as PageLayout,
  runtimePopConfirm as PopConfirm,
  runtimePopOver as PopOver,
  runtimeRadio as Radio,
  runtimeRow as Row,
  runtimeSelect as Select,
  runtimeSpace as Space,
  runtimeSteps as Steps,
  runtimeSwitch as Switch,
  runtimeTabPane as TabPane,
  runtimeTable as Table,
  runtimeTabs as Tabs,
  runtimeTextarea as Textarea,
};

const runtimeMessage: PcUiModule["message"] = new Proxy({} as PcUiModule["message"], {
  get(_target, key: keyof PcUiModule["message"]) {
    return (...args: unknown[]) => {
      const method = getPcUi().message[key];
      if (typeof method !== "function") throw new Error(`pcUi message.${String(key)} 不可用`);
      return Reflect.apply(method, undefined, args);
    };
  },
});
export { runtimeMessage as message };

function runtimeUsePcForm(...args: Parameters<PcUiModule["usePcForm"]>): ReturnType<PcUiModule["usePcForm"]> {
  return getPcUi().usePcForm(...args);
}
export { runtimeUsePcForm as usePcForm };

function runtimeUsePcModal(...args: Parameters<PcUiModule["usePcModal"]>): ReturnType<PcUiModule["usePcModal"]> {
  return getPcUi().usePcModal(...args);
}
export { runtimeUsePcModal as usePcModal };

function runtimeUsePcTable(...args: Parameters<PcUiModule["usePcTable"]>): ReturnType<PcUiModule["usePcTable"]> {
  return getPcUi().usePcTable(...args);
}
export { runtimeUsePcTable as usePcTable };

const runtimeDayjs = new Proxy((...args: Parameters<PcUiModule["dayjs"]>) => getPcUi().dayjs(...args), {
  get(_target, key: keyof PcUiModule["dayjs"]) {
    const value = getPcUi().dayjs[key];
    return typeof value === "function" ? (...args: unknown[]) => Reflect.apply(value, getPcUi().dayjs, args) : value;
  },
}) as PcUiModule["dayjs"];
export { runtimeDayjs as dayjs };

export type { Dayjs, FormExpose, FormInstance } from "@g2-platform/pc-ui";
