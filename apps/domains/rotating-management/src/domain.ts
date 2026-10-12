import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { FileClient } from "@g2-client/file/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { DomainContext, DomainModule } from "@g2-composition/contract";
import type { GemMessageConfigClient } from "@g2-pages/generic-equipment-monitor";
import { defineComponent, h, type Component } from "vue";

import { APPLICATION_CODE_KEY, DOMAIN_CONTEXT_KEY, getRotatingManagementContext, installRotatingManagementContext } from "./domain-context";
import type { GemMountOptions } from "./mount-gem-page";
import { ROTATING_MANAGEMENT_BASE } from "./page-key-routes";

let domainConfig: Record<string, unknown> = {};
const GEM_PAGE_LIBRARY = "genericEquipmentMonitorPages";
const GEM_CONTRACT_MAJOR = 1;

function pageLibraryErrorPage(error: unknown): Component {
  const errorText = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "RotatingManagementPageLibraryLoadError",
    setup: () => () =>
      h("main", { style: "padding:32px;background:#fff;min-height:240px" }, [
        h("h2", "共享页面加载失败"),
        h("p", { style: "color:#8c8c8c" }, errorText),
        h("button", { type: "button", onClick: () => globalThis.location.reload() }, "重新加载"),
      ]),
  });
}

const context = (): DomainContext => getRotatingManagementContext();
const getAlarmClient = (): Promise<AlarmCenterClient> => context().ensureClient<AlarmCenterClient>("alarmCenterClient");
const getDeviceClient = (): Promise<DeviceCenterClient> => context().ensureClient<DeviceCenterClient>("deviceCenterClient");
const getOuaaClient = (): Promise<OuaaClient> => context().ensureClient<OuaaClient>("ouaaClient");
const getFileClient = (): Promise<FileClient> => context().ensureClient<FileClient>("fileClient");
const getDictionaryClient = (): Promise<DictionaryClient> => context().ensureClient<DictionaryClient>("dictionaryClient");
const getMessageConfigClient = (): Promise<GemMessageConfigClient> =>
  context().ensureClient<GemMessageConfigClient>("emergencyManagementClient");
const applicationCode = (): string =>
  typeof domainConfig.applicationCode === "string" && domainConfig.applicationCode ? domainConfig.applicationCode : "ROTATINGMANAGE";

async function hostGemPage(
  exposedPath: string,
  options?: Omit<
    GemMountOptions,
    "getAlarmClient" | "getDeviceClient" | "getOuaaClient" | "getFileClient" | "getDictionaryClient" | "getMessageConfigClient"
  >,
): Promise<Component> {
  try {
    const [loaded, contractModule, { mountGemPage }] = await Promise.all([
      context().loadPageLibrary<{ default?: Component }>(GEM_PAGE_LIBRARY, exposedPath),
      context().loadPageLibrary<{ contractInfo?: { major?: number } }>(GEM_PAGE_LIBRARY, "contractInfo"),
      import("./mount-gem-page"),
    ]);
    if (contractModule.contractInfo?.major !== GEM_CONTRACT_MAJOR)
      throw new Error(`page library contract major ${String(contractModule.contractInfo?.major)} is incompatible`);
    return mountGemPage(loaded.default ?? (loaded as Component), {
      ...options,
      getAlarmClient,
      getDeviceClient,
      getOuaaClient,
      getFileClient,
      getDictionaryClient,
      getMessageConfigClient,
      getFunctionCodes: () => context().getFunctionCodes(),
      pageProps: { applicationCode: applicationCode(), ...options?.pageProps },
    });
  } catch (error) {
    return pageLibraryErrorPage(error);
  }
}

const gem = (entry: string, exposed: string, title: string, options?: GemMountOptions, activeMenuEntry?: string) => ({
  path: `${ROTATING_MANAGEMENT_BASE}/${entry}`.replace(/\/$/, ""),
  name: `rotating-management-${entry.replaceAll("/", "-")}`,
  meta: activeMenuEntry ? { title, hideInMenu: true, activeMenuPath: `${ROTATING_MANAGEMENT_BASE}/${activeMenuEntry}` } : { title },
  component: () => hostGemPage(exposed, options),
});

const domainModule: DomainModule = {
  routes: [
    gem("", "OverView", "动环中心", { pageProps: { title: "动环中心" } }),
    gem("equipmentMonitorList", "EquipmentMonitorList", "设备监测"),
    gem("equipmentMoitorList", "EquipmentMonitorList", "设备监测", undefined, "equipmentMonitorList"),
    gem("equipmentMonitorDetail", "EquipmentMonitorDetail", "设备信息", { idAs: "deviceId" }, "equipmentMonitorList"),
    gem("equipmentMoitorDetail", "EquipmentMonitorDetail", "设备信息", { idAs: "deviceId" }, "equipmentMonitorList"),
    gem("configuration", "Configuration", "二维组态", { pageProps: { configurationUrl: String(domainConfig.configurationUrl || "") } }),
    gem("alarmRecord", "AlarmRecord", "报警记录"),
    gem("alarmDetail", "AlarmDetail", "报警详情", { idAs: "alarmId" }, "alarmRecord"),
    gem("alarmRecordSafety", "AlarmRecordSafety", "安全报警记录", undefined, "alarmRecord"),
    gem("alarmSafetyDetail", "AlarmSafetyDetail", "安全报警详情", { idAs: "alarmId" }, "alarmRecord"),
    gem("alarmConfigList", "AlarmConfigList", "报警配置"),
    gem("alarmConfigEnergyList", "AlarmConfigEnergyList", "能源报警配置", undefined, "alarmConfigList"),
    gem("alarmConfigureAdd", "AlarmConfigureAdd", "报警规则配置", { idAs: "ruleId" }, "alarmConfigList"),
    gem("alarm/record", "AlarmRecord", "下钻报警记录", undefined, "alarmStatistic"),
    gem("alarm-handler-sub-config", "AlarmHandlerSubmitConfig", "报警处理提交配置"),
    gem("alarmStatistic", "AlarmStatistic", "报警统计", { pageProps: { mode: "status", title: "报警统计" } }),
    gem("alarmHandelStatistics", "AlarmStatistic", "报警处理统计", { pageProps: { mode: "user", title: "报警处理统计" } }),
    gem("alarmAnalysis", "AlarmStatistic", "动环分析", { pageProps: { mode: "event", title: "动环分析" } }),
    gem("applicationEquipment", "ApplicationEquipment", "动环设备", { pageProps: { title: "动环设备" } }),
    gem("message-notice", "MessageNotice", "消息配置", { pageProps: { title: "消息配置" } }),
  ],
  menuContribution: [
    {
      label: "动环监控",
      iconKey: "security-monitor",
      children: [
        { label: "动环中心", entry: "", path: ROTATING_MANAGEMENT_BASE },
        {
          label: "动环监测",
          children: [
            {
              label: "设备监测",
              entry: "equipmentMonitorList",
              functionCode: "GEM_EQUIPMENT_LIST",
              path: `${ROTATING_MANAGEMENT_BASE}/equipmentMonitorList`,
            },
            {
              label: "二维组态",
              entry: "configuration",
              functionCode: "GEM_CONFIGURATION",
              path: `${ROTATING_MANAGEMENT_BASE}/configuration`,
            },
          ],
        },
        {
          label: "动环报警",
          children: [
            { label: "报警记录", entry: "alarmRecord", functionCode: "GEM_ALARM", path: `${ROTATING_MANAGEMENT_BASE}/alarmRecord` },
            {
              label: "报警配置",
              entry: "alarmConfigList",
              functionCode: "GEM_ALARM_CONFIG",
              path: `${ROTATING_MANAGEMENT_BASE}/alarmConfigList`,
            },
            {
              label: "报警处理提交配置",
              entry: "alarm-handler-sub-config",
              functionCode: "GEM_ALARM_CONFIG_EDIT",
              path: `${ROTATING_MANAGEMENT_BASE}/alarm-handler-sub-config`,
            },
          ],
        },
        {
          label: "统计分析",
          children: [
            {
              label: "报警统计",
              entry: "alarmStatistic",
              functionCode: "GEM_ALARM_STAT",
              path: `${ROTATING_MANAGEMENT_BASE}/alarmStatistic`,
            },
            {
              label: "报警处理统计",
              entry: "alarmHandelStatistics",
              functionCode: "GEM_ALARM_HANDLE_STAT",
              path: `${ROTATING_MANAGEMENT_BASE}/alarmHandelStatistics`,
            },
            {
              label: "动环分析",
              entry: "alarmAnalysis",
              functionCode: "GEM_ALARM_ANALYSIS",
              path: `${ROTATING_MANAGEMENT_BASE}/alarmAnalysis`,
            },
          ],
        },
        {
          label: "动环设备",
          entry: "applicationEquipment",
          functionCode: "GEM_ALARM_DEVICE",
          path: `${ROTATING_MANAGEMENT_BASE}/applicationEquipment`,
        },
        { label: "消息配置", entry: "message-notice", path: `${ROTATING_MANAGEMENT_BASE}/message-notice` },
      ],
    },
  ],
  async install(app, ctx, config) {
    domainConfig = config ?? {};
    installRotatingManagementContext(ctx);
    for (const platform of [
      "pcUi",
      "pcChart",
      "pcPlayer",
      "pcScada",
      "pcMap",
      "pcIotSocket",
      "pcAlarmCharts",
      "pcGraphEditor",
      "pcVisualSdk",
    ] as const)
      await ctx.loadPlatform(platform, "platform");
    for (const client of [
      "alarmCenterClient",
      "deviceCenterClient",
      "dictionaryClient",
      "emergencyManagementClient",
      "fileClient",
      "ouaaClient",
    ] as const)
      await ctx.ensureClient(client);
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
    app.provide(APPLICATION_CODE_KEY, applicationCode());
  },
};

export default domainModule;
