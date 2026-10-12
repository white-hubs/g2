import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { FileClient } from "@g2-client/file/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { DomainContext, DomainModule } from "@g2-composition/contract";
import {
  GEM_ACTION_KEYS,
  GEM_PAGE_KEYS,
  type GemCapabilityCodes,
  type NavigatePage,
  type PageNavigatePayload,
} from "@g2-pages/generic-equipment-monitor/contract";
import { defineComponent, h, type Component } from "vue";
import { useRoute, useRouter } from "vue-router";

import { APPLICATION_CODE_KEY, DOMAIN_CONTEXT_KEY } from "./domain-context";

const BASE = "/d/intruder-alarm";
const APPLICATION_CODE = "INTRUDER_ALARM";
const GEM_PAGE_LIBRARY = "genericEquipmentMonitorPages";
const GEM_CONTRACT_MAJOR = 1;

let installContext: DomainContext | null = null;
let domainConfig: Record<string, unknown> = {};

const GEM_CODES: GemCapabilityCodes = {
  page: {
    [GEM_PAGE_KEYS.overView]: "GEM_OVERVIEW",
    [GEM_PAGE_KEYS.equipmentMonitorList]: "GEM_EQUIPMENT_LIST",
    [GEM_PAGE_KEYS.equipmentMonitorDetail]: "GEM_EQUIPMENT_DETAIL",
    [GEM_PAGE_KEYS.alarmRecord]: "GEM_ALARM",
    [GEM_PAGE_KEYS.alarmDetail]: "GEM_ALARM_DETAIL",
    [GEM_PAGE_KEYS.alarmConfigList]: "GEM_ALARM_CONFIG",
    [GEM_PAGE_KEYS.alarmConfigureAdd]: "GEM_ALARM_CONFIG_EDIT",
    [GEM_PAGE_KEYS.alarmStatistic]: "GEM_ALARM_STAT",
    [GEM_PAGE_KEYS.alarmAnalysis]: "GEM_ALARM_ANALYSIS",
    [GEM_PAGE_KEYS.applicationEquipment]: "GEM_ALARM_DEVICE",
    [GEM_PAGE_KEYS.configuration]: "GEM_CONFIGURATION",
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

const GEM_ENTRY: Record<string, string> = {
  [GEM_PAGE_KEYS.overView]: "overView",
  [GEM_PAGE_KEYS.equipmentMonitorList]: "equipmentMonitorList",
  [GEM_PAGE_KEYS.equipmentMonitorDetail]: "equipmentMonitorDetail",
  [GEM_PAGE_KEYS.alarmRecord]: "alarmRecord",
  [GEM_PAGE_KEYS.alarmDetail]: "alarmDetail",
  [GEM_PAGE_KEYS.alarmConfigList]: "alarmConfigList",
  [GEM_PAGE_KEYS.alarmConfigureAdd]: "alarmConfigureAdd",
  [GEM_PAGE_KEYS.alarmStatistic]: "alarmStatistic",
  [GEM_PAGE_KEYS.alarmAnalysis]: "alarmAnalysis",
  [GEM_PAGE_KEYS.applicationEquipment]: "applicationEquipment",
  [GEM_PAGE_KEYS.configuration]: "configuration",
};

function requireContext(): DomainContext {
  if (!installContext) throw new Error("intruder-alarm domain not installed");
  return installContext;
}

function getAlarmClient(): Promise<AlarmCenterClient> {
  return requireContext().ensureClient<AlarmCenterClient>("alarmCenterClient");
}
function getDeviceClient(): Promise<DeviceCenterClient> {
  return requireContext().ensureClient<DeviceCenterClient>("deviceCenterClient");
}
function getOuaaClient(): Promise<OuaaClient> {
  return requireContext().ensureClient<OuaaClient>("ouaaClient");
}
function getFileClient(): Promise<FileClient> {
  return requireContext().ensureClient<FileClient>("fileClient");
}
function getDictionaryClient(): Promise<DictionaryClient> {
  return requireContext().ensureClient<DictionaryClient>("dictionaryClient");
}

function pageLibraryErrorPage(error: unknown): Component {
  const message = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "IntruderAlarmPageLibraryLoadError",
    setup: () => () =>
      h("main", { style: "padding:32px;background:#fff;min-height:240px" }, [
        h("h2", "共享页面加载失败"),
        h("p", { style: "color:#8c8c8c" }, message),
        h("button", { type: "button", onClick: () => globalThis.location.reload() }, "重新加载"),
      ]),
  });
}

function routeForGemPage(payload: PageNavigatePayload): string {
  const entry = GEM_ENTRY[payload.page];
  if (!entry) return BASE;
  const query = Object.entries(payload.params ?? {})
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return `${BASE}/${entry}${query ? `?${query}` : ""}`;
}

async function hostGemPage(
  exposedPath: string,
  options?: { idAs?: "deviceId" | "alarmId" | "ruleId"; pageProps?: Record<string, unknown> },
): Promise<Component> {
  try {
    const context = requireContext();
    const [loaded, contractModule] = await Promise.all([
      context.loadPageLibrary<{ default?: Component }>(GEM_PAGE_LIBRARY, exposedPath),
      context.loadPageLibrary<{ contractInfo?: { major?: number } }>(GEM_PAGE_LIBRARY, "contractInfo"),
    ]);
    if (contractModule.contractInfo?.major !== GEM_CONTRACT_MAJOR) {
      throw new Error(`page library "${GEM_PAGE_LIBRARY}" contract major is incompatible`);
    }
    const Page = loaded.default ?? (loaded as Component);
    return defineComponent({
      name: "IntruderAlarmGemPageMount",
      setup() {
        const router = useRouter();
        const route = useRoute();
        const id = String(route.query.id ?? "");
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
        const onNavigatePage: NavigatePage = (payload) => void router.push(routeForGemPage(payload));
        return () =>
          h(Page, {
            codes: GEM_CODES,
            functionCodes: [...context.getFunctionCodes()],
            onNavigatePage,
            getAlarmClient,
            getDeviceClient,
            getOuaaClient,
            getFileClient,
            getDictionaryClient,
            applicationCode: APPLICATION_CODE,
            ...idProps,
            ...options?.pageProps,
          });
      },
    });
  } catch (error) {
    return pageLibraryErrorPage(error);
  }
}

const domainModule: DomainModule = {
  routes: [
    { path: BASE, name: "intruder-alarm-home", meta: { title: "入侵报警" }, redirect: `${BASE}/overView` },
    {
      path: `${BASE}/overView`,
      name: "intruder-alarm-overview",
      meta: { title: "入侵中心" },
      component: () => hostGemPage("OverView", { pageProps: { title: "入侵中心" } }),
    },
    {
      path: `${BASE}/configuration`,
      name: "intruder-alarm-configuration",
      meta: { title: "二维组态" },
      component: () =>
        hostGemPage("Configuration", { pageProps: { title: "二维组态", configurationUrl: String(domainConfig.configurationUrl ?? "") } }),
    },
    {
      path: `${BASE}/equipmentMonitorList`,
      name: "intruder-alarm-monitor",
      meta: { title: "入侵监测" },
      component: () => hostGemPage("EquipmentMonitorList", { pageProps: { title: "入侵监测" } }),
    },
    {
      path: `${BASE}/equipmentMonitorDetail`,
      name: "intruder-alarm-monitor-detail",
      meta: { title: "设备信息", hideInMenu: true, activeMenuPath: `${BASE}/equipmentMonitorList` },
      component: () => hostGemPage("EquipmentMonitorDetail", { idAs: "deviceId", pageProps: { title: "设备信息" } }),
    },
    {
      path: `${BASE}/alarmRecord`,
      name: "intruder-alarm-record",
      meta: { title: "报警记录" },
      component: () => hostGemPage("AlarmRecord"),
    },
    {
      path: `${BASE}/alarmDetail`,
      name: "intruder-alarm-detail",
      meta: { title: "报警详情", hideInMenu: true, activeMenuPath: `${BASE}/alarmRecord` },
      component: () => hostGemPage("AlarmDetail", { idAs: "alarmId" }),
    },
    {
      path: `${BASE}/alarmConfigList`,
      name: "intruder-alarm-config",
      meta: { title: "报警配置" },
      component: () => hostGemPage("AlarmConfigList"),
    },
    {
      path: `${BASE}/alarmConfigureAdd`,
      name: "intruder-alarm-config-editor",
      meta: { title: "报警规则配置", hideInMenu: true, activeMenuPath: `${BASE}/alarmConfigList` },
      component: () => hostGemPage("AlarmConfigureAdd", { idAs: "ruleId" }),
    },
    {
      path: `${BASE}/alarmAnalysis`,
      name: "intruder-alarm-analysis",
      meta: { title: "报警分析" },
      component: () => hostGemPage("AlarmStatistic", { pageProps: { mode: "event", title: "报警分析" } }),
    },
    {
      path: `${BASE}/alarmStatistic`,
      name: "intruder-alarm-statistic",
      meta: { title: "报警统计" },
      component: () => hostGemPage("AlarmStatistic", { pageProps: { mode: "status", title: "报警统计" } }),
    },
    {
      path: `${BASE}/applicationEquipment`,
      name: "intruder-alarm-devices",
      meta: { title: "入侵报警设备" },
      component: () => hostGemPage("ApplicationEquipment", { pageProps: { title: "入侵报警设备" } }),
    },
  ],
  menuContribution: [
    { label: "入侵中心", iconKey: "intruder-alarm", entry: "overView", path: `${BASE}/overView` },
    {
      label: "设备监测",
      iconKey: "intruder-alarm",
      children: [
        { label: "二维组态", entry: "configuration", path: `${BASE}/configuration` },
        { label: "入侵监测", entry: "equipmentMonitorList", path: `${BASE}/equipmentMonitorList` },
      ],
    },
    {
      label: "入侵报警",
      iconKey: "intruder-alarm",
      children: [
        { label: "报警记录", entry: "alarmRecord", path: `${BASE}/alarmRecord` },
        { label: "报警配置", entry: "alarmConfigList", path: `${BASE}/alarmConfigList` },
      ],
    },
    {
      label: "统计分析",
      iconKey: "intruder-alarm",
      children: [
        { label: "报警分析", entry: "alarmAnalysis", path: `${BASE}/alarmAnalysis` },
        { label: "报警统计", entry: "alarmStatistic", path: `${BASE}/alarmStatistic` },
      ],
    },
    { label: "入侵报警设备", iconKey: "intruder-alarm", entry: "applicationEquipment", path: `${BASE}/applicationEquipment` },
  ],
  async install(app, ctx, config) {
    installContext = ctx;
    domainConfig = config ?? {};
    await ctx.loadPlatform("pcUi", "platform");
    await ctx.loadPlatform("pcChart", "platform");
    await ctx.loadPlatform("pcPlayer", "platform");
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
    app.provide(APPLICATION_CODE_KEY, APPLICATION_CODE);
  },
};

export default domainModule;
