import {
  GEM_ACTION_KEYS,
  GEM_PAGE_KEYS,
  type GemCapabilityCodes,
  type GemPageKey,
  type NavigatePage,
  type PageNavigatePayload,
} from "@g2-pages/generic-equipment-monitor/contract";
import { type Component, defineComponent, h } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getDeviceCenterClient, getMeetRoomApplicationCode, getMeetRoomContext, getOuaaClient } from "./domain-context";

const BASE = "/d/meet-room";
const LIBRARY = "genericEquipmentMonitorPages";

const PAGE_ENTRY: Record<GemPageKey, string> = {
  [GEM_PAGE_KEYS.overView]: "overView",
  [GEM_PAGE_KEYS.equipmentMonitorList]: "equipmentMoitorList",
  [GEM_PAGE_KEYS.equipmentMonitorDetail]: "equipmentMoitorDetail",
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
  page: Object.fromEntries(Object.values(GEM_PAGE_KEYS).map((key) => [key, `MEETING_ROOM_${key}`])),
  action: Object.fromEntries(Object.values(GEM_ACTION_KEYS).map((key) => [key, `MEETING_ROOM_${key}`])),
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
    name: "MeetRoomGemLoadError",
    setup: () => () =>
      h("main", { style: "padding:32px;background:#fff;min-height:240px" }, [
        h("h2", "共享页面加载失败"),
        h("p", { style: "color:#8c8c8c" }, message),
        h("button", { type: "button", onClick: () => globalThis.location.reload() }, "重新加载"),
      ]),
  });
}

export async function hostMeetRoomGemPage(
  exposed: "ApplicationEquipment" | "EquipmentMonitorDetail" | "EquipmentMonitorList",
): Promise<Component> {
  try {
    const context = getMeetRoomContext();
    const [loaded, contract] = await Promise.all([
      context.loadPageLibrary<{ default?: Component }>(LIBRARY, exposed),
      context.loadPageLibrary<{ contractInfo?: { major?: number } }>(LIBRARY, "contractInfo"),
    ]);
    if (contract.contractInfo?.major !== 1) {
      throw new Error(`页面库契约版本不兼容：${String(contract.contractInfo?.major)}`);
    }
    const Page = loaded.default ?? (loaded as Component);
    return defineComponent({
      name: `MeetRoom${exposed}Host`,
      setup() {
        const router = useRouter();
        const route = useRoute();
        const onNavigatePage: NavigatePage = (payload) => void router.push(target(payload));
        const deviceId = String(route.query.id ?? route.query.deviceId ?? "");
        return () =>
          h(Page, {
            applicationCode: getMeetRoomApplicationCode(),
            codes: CODES,
            functionCodes: [...context.getFunctionCodes()],
            getDeviceClient: getDeviceCenterClient,
            getOuaaClient,
            onNavigatePage,
            ...(exposed === "EquipmentMonitorDetail" ? { deviceId } : {}),
            ...(exposed === "ApplicationEquipment" ? { title: "智能设备" } : {}),
          });
      },
    });
  } catch (error) {
    return errorPage(error);
  }
}
