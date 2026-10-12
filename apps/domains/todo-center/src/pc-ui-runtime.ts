import type { DomainContext } from "@g2-composition/contract";
import { type Component, defineAsyncComponent, markRaw } from "vue";
type PcUi = typeof import("@g2-platform/pc-ui");
type Name = { [K in keyof PcUi]: PcUi[K] extends Component ? K : never }[keyof PcUi];
let ui: PcUi | undefined;
export async function installTodoCenterPcUi(ctx: DomainContext): Promise<void> {
  ui = await ctx.loadRuntimeCommon<PcUi>("pcUi", "index");
}
function getUi(): PcUi {
  if (!ui) {throw new Error("todo-center pcUi Runtime Common 尚未安装");}
  return ui;
}
function component<K extends Name>(name: K): PcUi[K] {
  return markRaw(defineAsyncComponent(async () => getUi()[name] as Component)) as unknown as PcUi[K];
}
export const Button: PcUi["Button"] = component("Button");
export const PageLayout: PcUi["PageLayout"] = component("PageLayout");
export const Input: PcUi["Input"] = component("Input");
export const Select: PcUi["Select"] = component("Select");
export const Empty: PcUi["Empty"] = component("Empty");
export const message: PcUi["message"] = new Proxy({} as PcUi["message"], {
  get(_target, key: keyof PcUi["message"]) {
    return (...args: unknown[]) => Reflect.apply(getUi().message[key], undefined, args);
  },
});
export const usePcTable: PcUi["usePcTable"] = (...args) => getUi().usePcTable(...args);
