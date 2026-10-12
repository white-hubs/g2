import type { DomainContext } from "@g2-composition/contract";
import { type Component, defineAsyncComponent, markRaw } from "vue";

export type PcUiModule = typeof import("@g2-platform/pc-ui");
type ComponentName = {
  [K in Extract<keyof PcUiModule, string>]: PcUiModule[K] extends Component ? K : never;
}[Extract<keyof PcUiModule, string>];

export function createPcUiRuntimeProxy(consumer: string) {
  let pcUi: PcUiModule | undefined;
  const getPcUi = (): PcUiModule => {
    if (!pcUi) {
      throw new Error(`${consumer} pcUi Runtime Common 尚未加载`);
    }
    return pcUi;
  };

  return {
    async install(context: Pick<DomainContext, "loadRuntimeCommon">): Promise<void> {
      pcUi = await context.loadRuntimeCommon<PcUiModule>("pcUi", "index");
    },
    component<K extends ComponentName>(name: K): PcUiModule[K] {
      const asyncComponent = markRaw(defineAsyncComponent(async () => getPcUi()[name] as Component));
      return new Proxy(asyncComponent, {
        get(target, key, receiver) {
          if (Reflect.has(target, key)) {
            return Reflect.get(target, key, receiver);
          }
          const providerComponent = getPcUi()[name] as object;
          const value = Reflect.get(providerComponent, key);
          return typeof value === "function" ? value.bind(providerComponent) : value;
        },
      }) as unknown as PcUiModule[K];
    },
    callable<K extends "dayjs" | "usePcForm" | "usePcTable" | "usePcQueryState">(name: K): PcUiModule[K] {
      const invoke = (...args: unknown[]) => {
        const value = getPcUi()[name];
        if (typeof value !== "function") {
          throw new TypeError(`${consumer} pcUi.${name} 不可用`);
        }
        return Reflect.apply(value, undefined, args);
      };
      return new Proxy(invoke, {
        get(_target, key) {
          const value = Reflect.get(getPcUi()[name] as object, key);
          return typeof value === "function" ? value.bind(getPcUi()[name]) : value;
        },
      }) as PcUiModule[K];
    },
    object<K extends "message">(name: K): PcUiModule[K] {
      return new Proxy(
        {},
        {
          get(_target, key) {
            const target = getPcUi()[name] as object;
            const value = Reflect.get(target, key);
            return typeof value === "function" ? value.bind(target) : value;
          },
        },
      ) as PcUiModule[K];
    },
  };
}
