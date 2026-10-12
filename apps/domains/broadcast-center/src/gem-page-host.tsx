import type { DomainContext } from "@g2-composition/contract";
import { defineComponent, h, type Component } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getApplicationCode, getBroadcastCenterContext, getDeviceCenterClient } from "./domain-context";

const GEM_PAGE_LIBRARY = "genericEquipmentMonitorPages";
const GEM_CONTRACT_MAJOR = 1;
const GEM_CODES = { page: {}, action: {} };

function pageLibraryErrorPage(error: unknown): Component {
  const message = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "BroadcastCenterPageLibraryLoadError",
    setup: () => () =>
      h("main", { style: "padding:32px;background:#fff;min-height:240px" }, [
        h("h2", "共享页面加载失败"),
        h("p", { style: "color:#8c8c8c" }, message),
        h("button", { type: "button", onClick: () => globalThis.location.reload() }, "重新加载"),
      ]),
  });
}

/** 广播中心使用自身应用编码托管 GEM 设备页，不能跳往已迁移的旧地址。 */
export async function hostBroadcastCenterGemPage(
  exposedPath: string,
  options?: { idAs?: "deviceId"; pageProps?: Record<string, unknown> },
): Promise<Component> {
  try {
    const context: DomainContext = getBroadcastCenterContext();
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
      name: "BroadcastCenterGemPageMount",
      setup() {
        const route = useRoute();
        const router = useRouter();
        const deviceId = String(route.query.id ?? "");
        return () =>
          h(Page, {
            codes: GEM_CODES,
            functionCodes: [...context.getFunctionCodes()],
            onNavigatePage: ({ page, params }: { page: string; params?: Record<string, unknown> }) => {
              if (page !== "equipmentMonitorDetail") return;
              void router.push({
                path: "/d/broadcast-center/equipment-monitor-detail",
                query: Object.fromEntries(Object.entries(params ?? {}).map(([key, value]) => [key, String(value)])),
              });
            },
            getDeviceClient: getDeviceCenterClient,
            applicationCode: getApplicationCode(),
            ...(options?.idAs === "deviceId" ? { deviceId } : {}),
            ...options?.pageProps,
          });
      },
    });
  } catch (error) {
    return pageLibraryErrorPage(error);
  }
}
