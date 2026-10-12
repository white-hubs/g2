import type { DomainContext } from "@g2-composition/contract";
import { defineAsyncComponent, markRaw, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName = {
  [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never;
}[keyof PcUiModule];

let pcUiModule: PcUiModule | undefined;

export async function installFireManagementPcUi(context: DomainContext): Promise<void> {
  pcUiModule = await context.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

function getPcUi(): PcUiModule {
  if (!pcUiModule) throw new Error("fire-management pcUi Runtime Common 尚未加载");
  return pcUiModule;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return markRaw(defineAsyncComponent(async () => getPcUi()[name] as Component)) as unknown as PcUiModule[K];
}

export const AppstoreOutlined: PcUiModule["AppstoreOutlined"] = component("AppstoreOutlined");
export const Button: PcUiModule["Button"] = component("Button");
export const Cascader: PcUiModule["Cascader"] = component("Cascader");
export const CloudUploadOutlined: PcUiModule["CloudUploadOutlined"] = component("CloudUploadOutlined");
export const DownloadOutlined: PcUiModule["DownloadOutlined"] = component("DownloadOutlined");
export const Empty: PcUiModule["Empty"] = component("Empty");
export const EnvironmentOutlined: PcUiModule["EnvironmentOutlined"] = component("EnvironmentOutlined");
export const Form: PcUiModule["Form"] = component("Form");
export const FormItem: PcUiModule["FormItem"] = component("FormItem");
export const FullscreenExitOutlined: PcUiModule["FullscreenExitOutlined"] = component("FullscreenExitOutlined");
export const FullscreenOutlined: PcUiModule["FullscreenOutlined"] = component("FullscreenOutlined");
export const HistoryOutlined: PcUiModule["HistoryOutlined"] = component("HistoryOutlined");
export const ImportOutlined: PcUiModule["ImportOutlined"] = component("ImportOutlined");
export const Input: PcUiModule["Input"] = component("Input");
export const InputNumber: PcUiModule["InputNumber"] = component("InputNumber");
export const InputPassword: PcUiModule["InputPassword"] = component("InputPassword");
export const InputSearch: PcUiModule["InputSearch"] = component("InputSearch");
export const LinkOutlined: PcUiModule["LinkOutlined"] = component("LinkOutlined");
export const LoadingOutlined: PcUiModule["LoadingOutlined"] = component("LoadingOutlined");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const Page: PcUiModule["Page"] = component("Page");
export const PageLayout: PcUiModule["PageLayout"] = component("PageLayout");
export const PlusOutlined: PcUiModule["PlusOutlined"] = component("PlusOutlined");
export const PopConfirm: PcUiModule["PopConfirm"] = component("PopConfirm");
export const PopOver: PcUiModule["PopOver"] = component("PopOver");
export const ReloadOutlined: PcUiModule["ReloadOutlined"] = component("ReloadOutlined");
export const SafetyCertificateOutlined: PcUiModule["SafetyCertificateOutlined"] = component("SafetyCertificateOutlined");
export const SaveOutlined: PcUiModule["SaveOutlined"] = component("SaveOutlined");
export const SearchOutlined: PcUiModule["SearchOutlined"] = component("SearchOutlined");
export const Select: PcUiModule["Select"] = component("Select");
export const SelectOption: PcUiModule["SelectOption"] = component("SelectOption");
export const SettingOutlined: PcUiModule["SettingOutlined"] = component("SettingOutlined");
export const Space: PcUiModule["Space"] = component("Space");
export const Spin: PcUiModule["Spin"] = component("Spin");
export const Switch: PcUiModule["Switch"] = component("Switch");
export const TabPane: PcUiModule["TabPane"] = component("TabPane");
export const Tabs: PcUiModule["Tabs"] = component("Tabs");
export const Tag: PcUiModule["Tag"] = component("Tag");
export const ToolOutlined: PcUiModule["ToolOutlined"] = component("ToolOutlined");
export const Tree: PcUiModule["Tree"] = component("Tree");
export const UploadDragger: PcUiModule["UploadDragger"] = component("UploadDragger");
export const VideoCameraOutlined: PcUiModule["VideoCameraOutlined"] = component("VideoCameraOutlined");
export const WarningOutlined: PcUiModule["WarningOutlined"] = component("WarningOutlined");

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
export const usePcQueryState: PcUiModule["usePcQueryState"] = (...args) => getPcUi().usePcQueryState(...args);
export const usePcTable: PcUiModule["usePcTable"] = (...args) => getPcUi().usePcTable(...args);

export const dayjs = new Proxy((...args: Parameters<PcUiModule["dayjs"]>) => getPcUi().dayjs(...args), {
  get(_target, key: keyof PcUiModule["dayjs"]) {
    const value = getPcUi().dayjs[key];
    return typeof value === "function" ? (...args: unknown[]) => Reflect.apply(value, getPcUi().dayjs, args) : value;
  },
}) as PcUiModule["dayjs"];

export type { ColumnType } from "@g2-platform/pc-ui";
