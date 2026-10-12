import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { FileClient } from "@g2-client/file/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { DomainContext } from "@g2-composition/contract";
import { GEM_ACTION_KEYS, GEM_PAGE_KEYS, type GemCapabilityCodes, type NavigatePage } from "@g2-pages/generic-equipment-monitor/contract";
import { defineComponent, h, type Component } from "vue";
import { useRoute, useRouter } from "vue-router";

import { getApplicationCode, getEnergyConsumptionContext } from "./domain-context";

const BASE = "/d/energy-consumption";
const GEM_PAGE_LIBRARY = "genericEquipmentMonitorPages";
const GEM_CONTRACT_MAJOR = 1;
const GEM_CODES: GemCapabilityCodes = {
  page: {
    [GEM_PAGE_KEYS.alarmRecord]: "GEM_ALARM",
    [GEM_PAGE_KEYS.alarmDetail]: "GEM_ALARM_DETAIL",
    [GEM_PAGE_KEYS.alarmConfigList]: "GEM_ALARM_CONFIG",
    [GEM_PAGE_KEYS.alarmConfigureAdd]: "GEM_ALARM_CONFIG_EDIT",
  },
  action: {
    [GEM_ACTION_KEYS.exportAlarm]: "GEM_ALARM_EXPORT",
    [GEM_ACTION_KEYS.ackAlarm]: "GEM_ALARM_ACK",
    [GEM_ACTION_KEYS.alarmRecordDelete]: "GEM_ALARM_DELETE",
    [GEM_ACTION_KEYS.alarmConfigCreate]: "GEM_ALARM_CONFIG_CREATE",
    [GEM_ACTION_KEYS.alarmConfigDetail]: "GEM_ALARM_CONFIG_DETAIL",
    [GEM_ACTION_KEYS.alarmConfigEdit]: "GEM_ALARM_CONFIG_EDIT",
    [GEM_ACTION_KEYS.alarmConfigCopy]: "GEM_ALARM_CONFIG_COPY",
    [GEM_ACTION_KEYS.alarmConfigEnable]: "GEM_ALARM_CONFIG_ENABLE",
    [GEM_ACTION_KEYS.alarmConfigDelete]: "GEM_ALARM_CONFIG_DELETE",
  },
};
const GEM_PATHS: Partial<Record<keyof typeof GEM_PAGE_KEYS, string>> = {
  [GEM_PAGE_KEYS.alarmRecord]: `${BASE}/alarm-record`,
  [GEM_PAGE_KEYS.alarmDetail]: `${BASE}/alarm-detail`,
  [GEM_PAGE_KEYS.alarmConfigList]: `${BASE}/alarm-config-list`,
  [GEM_PAGE_KEYS.alarmConfigureAdd]: `${BASE}/alarm-configure`,
};

type IdAs = "alarmId" | "ruleId";

function pageLibraryErrorPage(error: unknown): Component {
  const message = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "EnergyConsumptionPageLibraryLoadError",
    setup: () => () =>
      h("main", { style: "padding:32px;background:#fff;min-height:240px" }, [
        h("h2", "共享页面加载失败"),
        h("p", { style: "color:#8c8c8c" }, message),
        h("button", { type: "button", onClick: () => globalThis.location.reload() }, "重新加载"),
      ]),
  });
}

function getAlarmClient(): Promise<AlarmCenterClient> {
  return getEnergyConsumptionContext().ensureClient<AlarmCenterClient>("alarmCenterClient");
}

function getOuaaClient(): Promise<OuaaClient> {
  return getEnergyConsumptionContext().ensureClient<OuaaClient>("ouaaClient");
}

function getFileClient(): Promise<FileClient> {
  return getEnergyConsumptionContext().ensureClient<FileClient>("fileClient");
}

/** 共享报警页的内部跳转必须回到能碳 Domain，而非遗留 portal URL。 */
export async function hostEnergyGemPage(
  exposedPath: string,
  options?: { idAs?: IdAs; pageProps?: Record<string, unknown> },
): Promise<Component> {
  try {
    const context: DomainContext = getEnergyConsumptionContext();
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
      name: "EnergyConsumptionGemPageMount",
      setup() {
        const route = useRoute();
        const router = useRouter();
        const onNavigatePage: NavigatePage = ({ page, params }) => {
          const path = GEM_PATHS[page];
          if (!path) return;
          void router.push({ path, query: Object.fromEntries(Object.entries(params ?? {}).map(([key, value]) => [key, String(value)])) });
        };
        const id = String(route.query.id ?? "");
        const idProps =
          options?.idAs === "alarmId"
            ? { alarmId: id }
            : options?.idAs === "ruleId"
              ? { ruleId: id, mode: String(route.query.type ?? (id ? "edit" : "add")), copy: String(route.query.copy ?? "") }
              : {};
        return () =>
          h(Page, {
            codes: GEM_CODES,
            functionCodes: [...context.getFunctionCodes()],
            onNavigatePage,
            getAlarmClient,
            getOuaaClient,
            getFileClient,
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
