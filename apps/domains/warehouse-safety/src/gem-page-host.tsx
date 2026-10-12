import type { GemCapabilityCodes, GemPageKey, NavigatePage, PageNavigatePayload } from "@g2-pages/generic-equipment-monitor/contract";
import { GEM_ACTION_KEYS, GEM_PAGE_KEYS } from "@g2-pages/generic-equipment-monitor/contract";
import { defineComponent, h, type Component } from "vue";
import { useRoute, useRouter } from "vue-router";

import {
  getAlarmCenterClient,
  getDeviceCenterClient,
  getDictionaryClient,
  getFileClient,
  getOuaaClient,
  getWarehouseApplicationCode,
  getWarehouseSafetyContext,
} from "./domain-context";

const BASE = "/d/warehouse-safety";
const LIBRARY = "genericEquipmentMonitorPages";

const PAGE_ENTRY: Record<GemPageKey, string> = {
  [GEM_PAGE_KEYS.overView]: "overView",
  [GEM_PAGE_KEYS.equipmentMonitorList]: "equipmentMonitorList",
  [GEM_PAGE_KEYS.equipmentMonitorDetail]: "equipmentMonitorDetail",
  [GEM_PAGE_KEYS.alarmRecord]: "alarmRecord",
  [GEM_PAGE_KEYS.alarmDetail]: "alarmDetail",
  [GEM_PAGE_KEYS.alarmRecordSafety]: "alarmRecordSafety",
  [GEM_PAGE_KEYS.alarmSafetyDetail]: "alarmSafetyDetail",
  [GEM_PAGE_KEYS.alarmConfigList]: "alarmConfigList",
  [GEM_PAGE_KEYS.alarmConfigEnergyList]: "alarmConfigEnergyList",
  [GEM_PAGE_KEYS.alarmConfigureAdd]: "alarmConfigureAdd",
  [GEM_PAGE_KEYS.alarmStatistic]: "alarmStatistic",
  [GEM_PAGE_KEYS.alarmDrillRecord]: "alarm/record",
  [GEM_PAGE_KEYS.alarmHandelStatistics]: "alarmHandelStatistics",
  [GEM_PAGE_KEYS.alarmAnalysis]: "alarmAnalysis",
  [GEM_PAGE_KEYS.applicationEquipment]: "applicationEquipment",
  [GEM_PAGE_KEYS.configuration]: "configuration",
};

const CODES: GemCapabilityCodes = {
  page: Object.fromEntries(Object.values(GEM_PAGE_KEYS).map((key) => [key, `WAREHOUSE_SAFETY_${key}`])),
  action: Object.fromEntries(Object.values(GEM_ACTION_KEYS).map((key) => [key, `WAREHOUSE_SAFETY_${key}`])),
};

function target(payload: PageNavigatePayload): string {
  const entry = PAGE_ENTRY[payload.page];
  const query = new URLSearchParams(
    Object.entries(payload.params ?? {}).filter(([, value]) => value !== undefined && value !== ""),
  ).toString();
  return `${BASE}/${entry}${query ? `?${query}` : ""}`;
}

function errorPage(error: unknown): Component {
  const message = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "WarehouseSafetyGemLoadError",
    setup: () => () =>
      h("main", { style: "padding:32px;background:#fff;min-height:240px" }, [
        h("h2", "共享页面加载失败"),
        h("p", { style: "color:#8c8c8c" }, message),
        h("button", { type: "button", onClick: () => globalThis.location.reload() }, "重新加载"),
      ]),
  });
}

export type WarehouseGemOptions = {
  idAs?: "deviceId" | "alarmId" | "ruleId";
  pageProps?: Record<string, unknown>;
};

function clientProps(exposed: string): Record<string, unknown> {
  switch (exposed) {
    case "OverView":
      return { getAlarmClient: getAlarmCenterClient, getDeviceClient: getDeviceCenterClient };
    case "EquipmentMonitorList":
    case "EquipmentMonitorDetail":
    case "ApplicationEquipment":
      return { getDeviceClient: getDeviceCenterClient };
    case "AlarmRecord":
    case "AlarmDetail":
      return {
        getAlarmClient: getAlarmCenterClient,
        getOuaaClient,
        getFileClient,
        getDictionaryClient,
      };
    case "AlarmConfigureAdd":
      return {
        getAlarmClient: getAlarmCenterClient,
        getDeviceClient: getDeviceCenterClient,
        getOuaaClient,
      };
    case "AlarmHandelStatistics":
      return { getAlarmClient: getAlarmCenterClient, getOuaaClient };
    case "AlarmAnalysis":
      return { getAlarmClient: getAlarmCenterClient, getDeviceClient: getDeviceCenterClient };
    case "AlarmRecordSafety":
    case "AlarmSafetyDetail":
    case "AlarmConfigList":
    case "AlarmConfigEnergyList":
    case "AlarmStatistic":
      return { getAlarmClient: getAlarmCenterClient };
    default:
      return {};
  }
}

export async function hostWarehouseGemPage(exposed: string, options?: WarehouseGemOptions): Promise<Component> {
  try {
    const context = getWarehouseSafetyContext();
    const [loaded, contract] = await Promise.all([
      context.loadPageLibrary<{ default?: Component }>(LIBRARY, exposed),
      context.loadPageLibrary<{ contractInfo?: { major?: number } }>(LIBRARY, "contractInfo"),
    ]);
    if (contract.contractInfo?.major !== 1) {
      throw new Error(`页面库契约版本不兼容：${String(contract.contractInfo?.major)}`);
    }
    const Page = loaded.default ?? (loaded as Component);
    return defineComponent({
      name: `WarehouseSafety${exposed}Host`,
      setup() {
        const router = useRouter();
        const route = useRoute();
        const onNavigatePage: NavigatePage = (payload) => void router.push(target(payload));
        const id = String(route.query.id ?? route.query.businessKey ?? "");
        const idProps =
          options?.idAs === "deviceId"
            ? { deviceId: id }
            : options?.idAs === "alarmId"
              ? { alarmId: id }
              : options?.idAs === "ruleId"
                ? {
                    ruleId: id,
                    mode: String(route.query.type ?? (id ? "edit" : "add")),
                    copy: String(route.query.copy ?? ""),
                  }
                : {};
        return () =>
          h(Page, {
            codes: CODES,
            functionCodes: [...context.getFunctionCodes()],
            onNavigatePage,
            ...clientProps(exposed),
            applicationCode: getWarehouseApplicationCode(),
            ...idProps,
            ...options?.pageProps,
          });
      },
    });
  } catch (error) {
    return errorPage(error);
  }
}
