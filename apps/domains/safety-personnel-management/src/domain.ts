import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { FileClient } from "@g2-client/file/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { SafetyPersonnelClient } from "@g2-client/safety-personnel/client";
import type { DomainContext, DomainModule } from "@g2-composition/contract";
import {
  GEM_ACTION_KEYS,
  GEM_PAGE_KEYS,
  type GemCapabilityCodes,
  type NavigatePage,
  type PageNavigatePayload,
} from "@g2-pages/generic-equipment-monitor/contract";
import {
  CertificatesPage,
  CertConfigPage,
  CommitteePage,
  HomePage,
  installSafetyPersonnelPages,
  KeyPersonnelPage,
  KeyPersonnelStatisticsPage,
  KeyPersonnelTrackPage,
  OrgConfigPage,
  PersonnelPage,
} from "@g2-pages/safety-personnel-management";
import { defineComponent, h } from "vue";
import { RouterView } from "vue-router";
import { useRoute, useRouter } from "vue-router";

const BASE = "/d/safety-personnel-management";
const GEM_PAGE_LIBRARY = "genericEquipmentMonitorPages";
let installContext: DomainContext | null = null;

const GEM_CODES: GemCapabilityCodes = {
  page: {
    [GEM_PAGE_KEYS.alarmRecord]: "GEM_ALARM",
    [GEM_PAGE_KEYS.alarmDetail]: "GEM_ALARM_DETAIL",
    [GEM_PAGE_KEYS.alarmConfigList]: "GEM_ALARM_CONFIG",
    [GEM_PAGE_KEYS.alarmConfigureAdd]: "GEM_ALARM_CONFIG_EDIT",
  },
  action: {
    [GEM_ACTION_KEYS.exportAlarm]: "GEM_ALARM_EXPORT",
    [GEM_ACTION_KEYS.ackAlarm]: "GEM_ALARM",
    [GEM_ACTION_KEYS.alarmRecordDelete]: "GEM_ALARM_DELETE",
    [GEM_ACTION_KEYS.alarmConfigCreate]: "GEM_ALARM_CONFIG",
    [GEM_ACTION_KEYS.alarmConfigDetail]: "GEM_ALARM_CONFIG",
    [GEM_ACTION_KEYS.alarmConfigEdit]: "GEM_ALARM_CONFIG",
    [GEM_ACTION_KEYS.alarmConfigCopy]: "GEM_ALARM_CONFIG",
    [GEM_ACTION_KEYS.alarmConfigEnable]: "GEM_ALARM_CONFIG",
    [GEM_ACTION_KEYS.alarmConfigDelete]: "GEM_ALARM_CONFIG",
  },
};

const GEM_ENTRIES: Record<string, string> = {
  [GEM_PAGE_KEYS.alarmRecord]: "key-personnel/alarm-record",
  [GEM_PAGE_KEYS.alarmDetail]: "key-personnel/alarm-detail",
  [GEM_PAGE_KEYS.alarmConfigList]: "key-personnel/alarm-config",
  [GEM_PAGE_KEYS.alarmConfigureAdd]: "key-personnel/alarm-config/edit",
};

function routeForGemPage(payload: PageNavigatePayload): string {
  const entry = GEM_ENTRIES[payload.page] ?? "key-personnel";
  const query = Object.entries(payload.params ?? {})
    .filter(([, value]) => value !== undefined && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
  return `${BASE}/${entry}${query ? `?${query}` : ""}`;
}

async function hostGemPage(exposedPath: string, idAs?: "alarmId" | "ruleId"): Promise<import("vue").Component> {
  if (!installContext) throw new Error("safety-personnel-management domain not installed");
  const context = installContext;
  const [loaded, contractModule] = await Promise.all([
    context.loadPageLibrary<{ default?: import("vue").Component }>(GEM_PAGE_LIBRARY, exposedPath),
    context.loadPageLibrary<{ contractInfo?: { major?: number } }>(GEM_PAGE_LIBRARY, "contractInfo"),
  ]);
  if (contractModule.contractInfo?.major !== 1) throw new Error("generic equipment monitor contract is incompatible");
  const Page = loaded.default ?? (loaded as import("vue").Component);
  return defineComponent({
    name: "SafetyPersonnelGemPageMount",
    setup() {
      const route = useRoute();
      const router = useRouter();
      const id = String(route.query.id ?? "");
      const idProps =
        idAs === "alarmId"
          ? { alarmId: id }
          : idAs === "ruleId"
            ? { ruleId: id, mode: String(route.query.type ?? (id ? "edit" : "add")), copy: String(route.query.copy ?? "") }
            : {};
      const onNavigatePage: NavigatePage = (payload) => void router.push(routeForGemPage(payload));
      return () =>
        h(Page, {
          codes: GEM_CODES,
          functionCodes: [...context.getFunctionCodes()],
          onNavigatePage,
          applicationCode: "SAFETY_PERSONNEL",
          getAlarmClient: () => context.ensureClient<AlarmCenterClient>("alarmCenterClient"),
          getDeviceClient: () => context.ensureClient<DeviceCenterClient>("deviceCenterClient"),
          getOuaaClient: () => context.ensureClient<OuaaClient>("ouaaClient"),
          getFileClient: () => context.ensureClient<FileClient>("fileClient"),
          getDictionaryClient: () => context.ensureClient<DictionaryClient>("dictionaryClient"),
          ...idProps,
        });
    },
  });
}
const Layout = defineComponent({ name: "SafetyPersonnelManagementLayout", setup: () => () => h(RouterView) });

const domainModule: DomainModule = {
  routes: [
    {
      path: BASE,
      component: Layout,
      children: [
        { path: "", redirect: `${BASE}/personnel` },
        { path: "home", name: "safetyPersonnelHome", meta: { title: "首页" }, component: HomePage },
        { path: "personnel", name: "safetyPersonnelList", meta: { title: "人员管理" }, component: PersonnelPage },
        { path: "committee", name: "safetyPersonnelCommittee", meta: { title: "安委会管理" }, component: CommitteePage },
        { path: "certificates", name: "safetyPersonnelCertificates", meta: { title: "证书管理" }, component: CertificatesPage },
        { path: "config/cert", name: "safetyPersonnelCertConfig", meta: { title: "证书配置" }, component: CertConfigPage },
        { path: "config/org", name: "safetyPersonnelOrgConfig", meta: { title: "组织管理配置" }, component: OrgConfigPage },
        { path: "key-personnel", name: "keyPersonnel", meta: { title: "重点人员信息管理" }, component: KeyPersonnelPage },
        {
          path: "key-personnel/alarm-record",
          name: "keyPersonnelAlarmRecord",
          meta: { title: "报警记录" },
          component: () => hostGemPage("AlarmRecord"),
        },
        {
          path: "key-personnel/alarm-detail",
          name: "keyPersonnelAlarmDetail",
          meta: { title: "报警详情", hideInMenu: true },
          component: () => hostGemPage("AlarmDetail", "alarmId"),
        },
        {
          path: "key-personnel/alarm-config",
          name: "keyPersonnelAlarmConfig",
          meta: { title: "报警配置" },
          component: () => hostGemPage("AlarmConfigList"),
        },
        {
          path: "key-personnel/alarm-config/edit",
          name: "keyPersonnelAlarmConfigEdit",
          meta: { title: "报警规则配置", hideInMenu: true },
          component: () => hostGemPage("AlarmConfigureAdd", "ruleId"),
        },
        { path: "key-personnel/track", name: "keyPersonnelTrack", meta: { title: "行为轨迹查询" }, component: KeyPersonnelTrackPage },
        {
          path: "key-personnel/equipment",
          name: "keyPersonnelEquipment",
          meta: { title: "设备关联" },
          component: () => hostGemPage("EquipmentAssociation"),
        },
        {
          path: "key-personnel/statistics",
          name: "keyPersonnelStatistics",
          meta: { title: "统计分析看板" },
          component: KeyPersonnelStatisticsPage,
        },
      ],
    },
  ],
  menuContribution: [
    {
      label: "安全人员管理",
      iconKey: "safety-personnel",
      children: [
        { label: "首页", entry: "safetyPersonnelHome", path: `${BASE}/home` },
        {
          label: "安全人员",
          children: [
            { label: "人员管理", entry: "safetyPersonnelList", path: `${BASE}/personnel` },
            { label: "安委会管理", entry: "safetyPersonnelCommittee", path: `${BASE}/committee` },
            { label: "证书管理", entry: "safetyPersonnelCertificates", path: `${BASE}/certificates` },
            { label: "证书配置", entry: "safetyPersonnelCertConfig", path: `${BASE}/config/cert` },
            { label: "组织配置", entry: "safetyPersonnelOrgConfig", path: `${BASE}/config/org` },
          ],
        },
        {
          label: "重点人员",
          children: [
            { label: "重点人员", entry: "keyPersonnel", path: `${BASE}/key-personnel` },
            { label: "报警记录", entry: "keyPersonnelAlarmRecord", path: `${BASE}/key-personnel/alarm-record` },
            { label: "报警配置", entry: "keyPersonnelAlarmConfig", path: `${BASE}/key-personnel/alarm-config` },
            { label: "行为轨迹", entry: "keyPersonnelTrack", path: `${BASE}/key-personnel/track` },
            { label: "设备关联", entry: "keyPersonnelEquipment", path: `${BASE}/key-personnel/equipment` },
            { label: "数据分析", entry: "keyPersonnelStatistics", path: `${BASE}/key-personnel/statistics` },
          ],
        },
      ],
    },
  ],
  async install(_app, ctx) {
    installContext = ctx;
    await ctx.loadPlatform("pcUi", "platform");
    const client = await ctx.ensureClient<SafetyPersonnelClient>("safetyPersonnelClient");
    installSafetyPersonnelPages(client, {
      file: () => ctx.ensureClient("fileClient"),
      ouaa: () => ctx.ensureClient("ouaaClient"),
      alarm: () => ctx.ensureClient("alarmCenterClient"),
      dictionary: () => ctx.ensureClient("dictionaryClient"),
    });
  },
};

export default domainModule;
