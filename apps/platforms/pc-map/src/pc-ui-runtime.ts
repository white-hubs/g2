import type { PlatformContext } from "@g2-composition/contract";
import { loadRuntimeCommon } from "@g2-runtime/common-loader";
import { defineAsyncComponent, markRaw, type Component } from "vue";

type PcUiModule = typeof import("@g2-platform/pc-ui");
type PcUiComponentName = {
  [K in keyof PcUiModule]: PcUiModule[K] extends Component ? K : never;
}[keyof PcUiModule];

let pcUi: PcUiModule | undefined;
let pcUiLoading: Promise<PcUiModule> | undefined;

/** 库型 Runtime Common 按需消费时不会执行 Platform.install，组件自行通过 Shell 的唯一入口加载公共 UI。 */
export function loadPcMapPcUi(): Promise<PcUiModule> {
  if (pcUi) {
    return Promise.resolve(pcUi);
  }
  if (!pcUiLoading) {
    pcUiLoading = loadRuntimeCommon<PcUiModule>("pcUi", "index")
      .then((module) => {
        pcUi = module;
        return module;
      })
      .catch((error: unknown) => {
        pcUiLoading = undefined;
        throw error;
      });
  }
  return pcUiLoading;
}

export async function installPcMapPcUi(ctx: PlatformContext): Promise<void> {
  pcUi = await ctx.loadRuntimeCommon<PcUiModule>("pcUi", "index");
}

export function getPcMapPcUi(): PcUiModule {
  if (!pcUi) throw new Error("pcMap pcUi Runtime Common 尚未加载");
  return pcUi;
}

function component<K extends PcUiComponentName>(name: K): PcUiModule[K] {
  return markRaw(defineAsyncComponent(async () => (await loadPcMapPcUi())[name] as Component)) as unknown as PcUiModule[K];
}

export const Button: PcUiModule["Button"] = component("Button");
export const Input: PcUiModule["Input"] = component("Input");
export const Modal: PcUiModule["Modal"] = component("Modal");
export const Spin: PcUiModule["Spin"] = component("Spin");

type PcUiMessage = PcUiModule["message"];
export const message: PcUiMessage = new Proxy({} as PcUiMessage, {
  get(_target, key: keyof PcUiMessage) {
    return (...args: unknown[]) => {
      const method = getPcMapPcUi().message[key];
      if (typeof method !== "function") throw new Error(`pcUi message.${String(key)} 不可用`);
      return Reflect.apply(method, undefined, args);
    };
  },
});
