import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, markRaw, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName =
  | "Button"
  | "Image"
  | "Input"
  | "Modal"
  | "Page"
  | "PageLayout"
  | "SearchOutlined"
  | "Select"
  | "Slider"
  | "Space"
  | "Spin"
  | "Table"
  | "Tag"
  | "TreeSelect";

let pcUiModule: PcUiModule | undefined;

export async function installEmergencyDispatchPcUi(context: DomainContext): Promise<void> {
  pcUiModule = await context.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

function getPcUi(): PcUiModule {
  if (!pcUiModule) throw new Error("emergency-dispatch pcUi Runtime Common 尚未加载");
  return pcUiModule;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return markRaw(defineAsyncComponent(async () => getPcUi()[name] as Component)) as unknown as PcUiModule[K];
}

const runtimeButton: PcUiModule["Button"] = component("Button");
const runtimeImage: PcUiModule["Image"] = component("Image");
const runtimeInput: PcUiModule["Input"] = component("Input");
const runtimeModal: PcUiModule["Modal"] = component("Modal");
const runtimePage: PcUiModule["Page"] = component("Page");
const runtimePageLayout: PcUiModule["PageLayout"] = component("PageLayout");
const runtimeSearchOutlined: PcUiModule["SearchOutlined"] = component("SearchOutlined");
const runtimeSelect: PcUiModule["Select"] = component("Select");
const runtimeSlider: PcUiModule["Slider"] = component("Slider");
const runtimeSpace: PcUiModule["Space"] = component("Space");
const runtimeSpin: PcUiModule["Spin"] = component("Spin");
const runtimeTable: PcUiModule["Table"] = component("Table");
const runtimeTag: PcUiModule["Tag"] = component("Tag");
const runtimeTreeSelect: PcUiModule["TreeSelect"] = component("TreeSelect");

export {
  runtimeButton as Button,
  runtimeImage as Image,
  runtimeInput as Input,
  runtimeModal as Modal,
  runtimePage as Page,
  runtimePageLayout as PageLayout,
  runtimeSearchOutlined as SearchOutlined,
  runtimeSelect as Select,
  runtimeSlider as Slider,
  runtimeSpace as Space,
  runtimeSpin as Spin,
  runtimeTable as Table,
  runtimeTag as Tag,
  runtimeTreeSelect as TreeSelect,
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
export type { ColumnType } from "@g2-platform/pc-ui";
