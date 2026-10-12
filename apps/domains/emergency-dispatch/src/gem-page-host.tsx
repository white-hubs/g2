import type { DomainContext } from "@g2-composition/contract";
import { defineComponent, h, type Component } from "vue";

import { getApplicationCode, getDeviceCenterClient, getEmergencyDispatchContext } from "./domain-context";

const GEM_PAGE_LIBRARY = "genericEquipmentMonitorPages";
const GEM_CONTRACT_MAJOR = 1;
const GEM_CODES = { page: {}, action: {} };

function pageLibraryErrorPage(error: unknown): Component {
  const message = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "EmergencyDispatchPageLibraryLoadError",
    setup: () => () =>
      h("main", { style: "padding:32px;background:#fff;min-height:240px" }, [
        h("h2", "共享页面加载失败"),
        h("p", { style: "color:#8c8c8c" }, message),
        h("button", { type: "button", onClick: () => globalThis.location.reload() }, "重新加载"),
      ]),
  });
}

/** 将设备关联页面托管在应急指挥域，避免回落到旧 portal 应用。 */
export async function hostEmergencyDispatchGemPage(exposedPath: string, pageProps?: Record<string, unknown>): Promise<Component> {
  try {
    const context: DomainContext = getEmergencyDispatchContext();
    const [loaded, contractModule] = await Promise.all([
      context.loadPageLibrary<{ default?: Component }>(GEM_PAGE_LIBRARY, exposedPath),
      context.loadPageLibrary<{ contractInfo?: { major?: number } }>(GEM_PAGE_LIBRARY, "contractInfo"),
    ]);
    if (contractModule.contractInfo?.major !== GEM_CONTRACT_MAJOR) {
      throw new Error(
        `page library "${GEM_PAGE_LIBRARY}" contract major ${String(contractModule.contractInfo?.major)} is incompatible; expected ${GEM_CONTRACT_MAJOR}`,
      );
    }
    const Page = loaded.default ?? (loaded as Component);
    return defineComponent({
      name: "EmergencyDispatchGemPageMount",
      setup: () => () =>
        h(Page, {
          codes: GEM_CODES,
          functionCodes: [...context.getFunctionCodes()],
          onNavigatePage: () => undefined,
          getDeviceClient: getDeviceCenterClient,
          applicationCode: getApplicationCode(),
          ...pageProps,
        }),
    });
  } catch (error) {
    return pageLibraryErrorPage(error);
  }
}
