import type { DomainContext } from "@g2-composition/contract";
import { defineComponent, h, type Component } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  getAlarmCenterClient,
  getApplicationCode,
  getDeviceCenterClient,
  getDictionaryClient,
  getFileClient,
  getFireManagementContext,
  getMessageConfigClient,
  getOuaaClient,
} from "./domain-context";

const GEM_PAGE_LIBRARY = "genericEquipmentMonitorPages";
const GEM_CONTRACT_MAJOR = 1;
const GEM_CODES = { page: {}, action: {} };
const PAGE_PATHS: Record<string, string> = {
  overView: "/d/fire-management/overview",
  equipmentMonitorList: "/d/fire-management/fire-device-list",
  equipmentMonitorDetail: "/d/fire-management/fire-device-detail",
  alarmRecord: "/d/fire-management/alarm-record",
  alarmDetail: "/d/fire-management/alarm-detail",
  alarmConfigList: "/d/fire-management/alarm-config",
  alarmConfigureAdd: "/d/fire-management/alarm-config/edit",
  alarmStatistic: "/d/fire-management/alarm-statistic",
  alarmHandelStatistics: "/d/fire-management/alarm-handle-statistics",
  alarmAnalysis: "/d/fire-management/fire-analysis",
};

function pageLibraryErrorPage(error: unknown): Component {
  const errorText = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "FireManagementPageLibraryLoadError",
    setup: () => () =>
      h("main", { style: "padding:32px;background:#fff;min-height:240px" }, [
        h("h2", "设备监测页面加载失败"),
        h("p", { style: "color:#8c8c8c" }, errorText),
        h("button", { type: "button", onClick: () => globalThis.location.reload() }, "重新加载"),
      ]),
  });
}

export async function hostFireManagementGemPage(
  exposedPath: string,
  options?: { idAs?: "deviceId" | "alarmId" | "ruleId"; pageProps?: Record<string, unknown> },
): Promise<Component> {
  try {
    const context: DomainContext = getFireManagementContext();
    const [loaded, contractModule] = await Promise.all([
      context.loadPageLibrary<{ default?: Component }>(GEM_PAGE_LIBRARY, exposedPath),
      context.loadPageLibrary<{ contractInfo?: { major?: number } }>(GEM_PAGE_LIBRARY, "contractInfo"),
    ]);
    if (contractModule.contractInfo?.major !== GEM_CONTRACT_MAJOR) {
      throw new Error(`page library contract major ${String(contractModule.contractInfo?.major)} is incompatible`);
    }
    const Page = loaded.default ?? (loaded as Component);
    return defineComponent({
      name: "FireManagementGemPageMount",
      setup() {
        const route = useRoute();
        const router = useRouter();
        const id = String(route.query.id ?? "");
        const idProps =
          options?.idAs === "deviceId"
            ? { deviceId: id }
            : options?.idAs === "alarmId"
              ? { alarmId: id }
              : options?.idAs === "ruleId"
                ? { ruleId: id, mode: String(route.query.type ?? (id ? "edit" : "add")), copy: String(route.query.copy ?? "") }
                : {};
        return () =>
          h(Page, {
            codes: GEM_CODES,
            functionCodes: [...context.getFunctionCodes()],
            onNavigatePage: ({ page, params }: { page: string; params?: Record<string, unknown> }) => {
              const path = PAGE_PATHS[page] ?? PAGE_PATHS.equipmentMonitorList;
              void router.push({
                path,
                query: Object.fromEntries(Object.entries(params ?? {}).map(([key, value]) => [key, String(value)])),
              });
            },
            getAlarmClient: getAlarmCenterClient,
            getDeviceClient: getDeviceCenterClient,
            getOuaaClient,
            getFileClient,
            getDictionaryClient,
            getMessageConfigClient,
            applicationCode: getApplicationCode(),
            ...idProps,
            ...options?.pageProps,
          });
      },
    });
  } catch (error) {
    return pageLibraryErrorPage(error);
  }
}
