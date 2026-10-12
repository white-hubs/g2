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

const BASE = "/d/gas-management";
const APPLICATION_CODE = "GAS_MANAGEMENT";
const GEM_PAGE_LIBRARY = "genericEquipmentMonitorPages";
const GEM_CONTRACT_MAJOR = 1;

let installContext: DomainContext | null = null;

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
    [GEM_PAGE_KEYS.alarmHandelStatistics]: "GEM_ALARM_HANDLE_STAT",
    [GEM_PAGE_KEYS.applicationEquipment]: "GEM_ALARM_DEVICE",
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
  [GEM_PAGE_KEYS.alarmHandelStatistics]: "alarmHandelStatistics",
  [GEM_PAGE_KEYS.applicationEquipment]: "applicationEquipment",
};

function requireContext(): DomainContext {
  if (!installContext) throw new Error("gas-management domain not installed");
  return installContext;
}

function pageLibraryErrorPage(error: unknown): Component {
  const message = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "GasManagementPageLibraryLoadError",
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
    if (contractModule.contractInfo?.major !== GEM_CONTRACT_MAJOR)
      throw new Error(`page library "${GEM_PAGE_LIBRARY}" contract major is incompatible`);
    const Page = loaded.default ?? (loaded as Component);
    return defineComponent({
      name: "GasManagementGemPageMount",
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
                ? { ruleId: id, mode: String(route.query.type ?? (id ? "edit" : "add")), copy: String(route.query.copy ?? "") }
                : {};
        const onNavigatePage: NavigatePage = (payload) => void router.push(routeForGemPage(payload));
        return () =>
          h(Page, {
            codes: GEM_CODES,
            functionCodes: [...context.getFunctionCodes()],
            onNavigatePage,
            getAlarmClient: () => context.ensureClient<AlarmCenterClient>("alarmCenterClient"),
            getDeviceClient: () => context.ensureClient<DeviceCenterClient>("deviceCenterClient"),
            getOuaaClient: () => context.ensureClient<OuaaClient>("ouaaClient"),
            getFileClient: () => context.ensureClient<FileClient>("fileClient"),
            getDictionaryClient: () => context.ensureClient<DictionaryClient>("dictionaryClient"),
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
    { path: BASE, name: "gas-management-home", meta: { title: "用气管理" }, redirect: `${BASE}/overView` },
    {
      path: `${BASE}/overView`,
      name: "gas-management-overview",
      meta: { title: "数据总览" },
      component: () => hostGemPage("OverView", { pageProps: { title: "数据总览" } }),
    },
    {
      path: `${BASE}/equipmentMonitorList`,
      name: "gas-management-monitor",
      meta: { title: "用气监测" },
      component: () => hostGemPage("EquipmentMonitorList", { pageProps: { title: "用气监测" } }),
    },
    {
      path: `${BASE}/equipmentMoitorList`,
      name: "gas-management-monitor-legacy-spelling",
      meta: { title: "用气监测", hideInMenu: true, activeMenuPath: `${BASE}/equipmentMonitorList` },
      component: () => hostGemPage("EquipmentMonitorList", { pageProps: { title: "用气监测" } }),
    },
    {
      path: `${BASE}/equipmentMonitorDetail`,
      name: "gas-management-monitor-detail",
      meta: { title: "设备信息", hideInMenu: true, activeMenuPath: `${BASE}/equipmentMonitorList` },
      component: () => hostGemPage("EquipmentMonitorDetail", { idAs: "deviceId", pageProps: { title: "设备信息" } }),
    },
    {
      path: `${BASE}/alarmRecord`,
      name: "gas-management-record",
      meta: { title: "报警记录" },
      component: () => hostGemPage("AlarmRecord"),
    },
    {
      path: `${BASE}/alarmDetail`,
      name: "gas-management-detail",
      meta: { title: "报警详情", hideInMenu: true, activeMenuPath: `${BASE}/alarmRecord` },
      component: () => hostGemPage("AlarmDetail", { idAs: "alarmId" }),
    },
    {
      path: `${BASE}/alarmConfigList`,
      name: "gas-management-config",
      meta: { title: "报警配置" },
      component: () => hostGemPage("AlarmConfigList"),
    },
    {
      path: `${BASE}/alarmConfigureAdd`,
      name: "gas-management-config-editor",
      meta: { title: "报警规则配置", hideInMenu: true, activeMenuPath: `${BASE}/alarmConfigList` },
      component: () => hostGemPage("AlarmConfigureAdd", { idAs: "ruleId" }),
    },
    {
      path: `${BASE}/alarmStatistic`,
      name: "gas-management-statistic",
      meta: { title: "报警统计" },
      component: () => hostGemPage("AlarmStatistic", { pageProps: { mode: "status", title: "报警统计" } }),
    },
    {
      path: `${BASE}/alarmHandelStatistics`,
      name: "gas-management-handler-statistic",
      meta: { title: "报警处理统计" },
      component: () => hostGemPage("AlarmStatistic", { pageProps: { mode: "user", title: "报警处理统计" } }),
    },
    {
      path: `${BASE}/applicationEquipment`,
      name: "gas-management-devices",
      meta: { title: "用气设备" },
      component: () => hostGemPage("ApplicationEquipment", { pageProps: { title: "用气设备" } }),
    },
  ],
  menuContribution: [
    { label: "数据总览", iconKey: "gas-management", entry: "overView", path: `${BASE}/overView` },
    { label: "用气监测", iconKey: "gas-management", entry: "equipmentMonitorList", path: `${BASE}/equipmentMonitorList` },
    {
      label: "用气报警",
      iconKey: "gas-management",
      children: [
        { label: "报警记录", entry: "alarmRecord", path: `${BASE}/alarmRecord` },
        { label: "报警配置", entry: "alarmConfigList", path: `${BASE}/alarmConfigList` },
      ],
    },
    {
      label: "统计分析",
      iconKey: "gas-management",
      children: [
        { label: "报警统计", entry: "alarmStatistic", path: `${BASE}/alarmStatistic` },
        { label: "报警处理统计", entry: "alarmHandelStatistics", path: `${BASE}/alarmHandelStatistics` },
      ],
    },
    { label: "用气设备", iconKey: "gas-management", entry: "applicationEquipment", path: `${BASE}/applicationEquipment` },
  ],
  async install(app, context) {
    installContext = context;
    await context.loadPlatform("pcUi", "platform");
    await context.loadPlatform("pcChart", "platform");
    await context.loadPlatform("pcPlayer", "platform");
    app.provide(DOMAIN_CONTEXT_KEY, context);
    app.provide(APPLICATION_CODE_KEY, APPLICATION_CODE);
  },
};

export default domainModule;
