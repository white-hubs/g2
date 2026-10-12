import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { FileClient } from "@g2-client/file/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { DomainContext, DomainModule } from "@g2-composition/contract";
import { defineComponent, h, type Component } from "vue";

import {
  APPLICATION_CODE_KEY,
  DOMAIN_CONTEXT_KEY,
  installAccessControlContext,
  installAccessControlPcChart,
  installAccessControlPcUi,
} from "./domain-context";
import type { GemMountOptions } from "./mount-gem-page";

let installCtx: DomainContext | null = null;
let domainConfig: Record<string, unknown> = {};
const GEM_PAGE_LIBRARY = "genericEquipmentMonitorPages";
const GEM_CONTRACT_MAJOR = 1;

function pageLibraryErrorPage(error: unknown): Component {
  const message = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "AccessControlPageLibraryLoadError",
    setup() {
      return () =>
        h("main", { style: "padding:32px;background:#fff;min-height:240px" }, [
          h("h2", "共享页面加载失败"),
          h("p", { style: "color:#8c8c8c" }, message),
          h("button", { type: "button", onClick: () => globalThis.location.reload() }, "重新加载"),
        ]);
    },
  });
}

function getAlarmClient(): Promise<AlarmCenterClient> {
  if (!installCtx) throw new Error("access-control domain not installed");
  return installCtx.ensureClient<AlarmCenterClient>("alarmCenterClient");
}

function getDeviceClient(): Promise<DeviceCenterClient> {
  if (!installCtx) throw new Error("access-control domain not installed");
  return installCtx.ensureClient<DeviceCenterClient>("deviceCenterClient");
}

function getOuaaClient(): Promise<OuaaClient> {
  if (!installCtx) throw new Error("access-control domain not installed");
  return installCtx.ensureClient<OuaaClient>("ouaaClient");
}

function getFileClient(): Promise<FileClient> {
  if (!installCtx) throw new Error("access-control domain not installed");
  return installCtx.ensureClient<FileClient>("fileClient");
}

function getDictionaryClient(): Promise<DictionaryClient> {
  if (!installCtx) throw new Error("access-control domain not installed");
  return installCtx.ensureClient<DictionaryClient>("dictionaryClient");
}

function resolveApplicationCode(): string {
  return typeof domainConfig.applicationCode === "string" && domainConfig.applicationCode ? domainConfig.applicationCode : "DOORMANAGE";
}

async function hostGemPage(
  exposedPath: string,
  options?: Omit<GemMountOptions, "getAlarmClient" | "getDeviceClient" | "getOuaaClient" | "getFileClient" | "getDictionaryClient">,
): Promise<Component> {
  if (!installCtx) throw new Error("access-control domain not installed");
  try {
    const [loaded, contractModule, { mountGemPage }] = await Promise.all([
      installCtx.loadPageLibrary<{ default?: Component }>(GEM_PAGE_LIBRARY, exposedPath),
      installCtx.loadPageLibrary<{ contractInfo?: { name?: string; major?: number } }>(GEM_PAGE_LIBRARY, "contractInfo"),
      import("./mount-gem-page"),
    ]);
    if (contractModule.contractInfo?.major !== GEM_CONTRACT_MAJOR) {
      throw new Error(
        `page library "${GEM_PAGE_LIBRARY}" contract major ${String(contractModule.contractInfo?.major)} is incompatible; expected ${GEM_CONTRACT_MAJOR}`,
      );
    }
    const Page = loaded.default ?? (loaded as Component);
    return mountGemPage(Page, {
      ...options,
      getAlarmClient,
      getDeviceClient,
      getOuaaClient,
      getFileClient,
      getDictionaryClient,
      getFunctionCodes: () => installCtx?.getFunctionCodes() ?? new Set(),
      pageProps: {
        applicationCode: resolveApplicationCode(),
        ...options?.pageProps,
      },
    });
  } catch (error) {
    return pageLibraryErrorPage(error);
  }
}

const domainModule: DomainModule = {
  routes: [
    {
      path: "/d/access-control",
      name: "access-control-home",
      meta: { title: "门禁总览" },
      component: () => import("./views/room-home"),
    },
    {
      // 243 门禁菜单「门禁设备」→ GEM applicationEquipment（非 roomDevicePage）
      path: "/d/access-control/devices",
      name: "access-control-devices",
      meta: { title: "门禁设备", hideInMenu: true, activeMenuPath: "/d/access-control/applicationEquipment" },
      component: () =>
        hostGemPage("ApplicationEquipment", {
          pageProps: { title: "门禁设备" },
        }),
    },
    {
      path: "/d/access-control/logs",
      name: "access-control-logs",
      meta: { title: "通行记录" },
      component: () => import("./views/room-log-page"),
    },
    {
      path: "/d/access-control/events",
      name: "access-control-events",
      meta: { title: "异常事件" },
      component: () => import("./views/room-event-page"),
    },
    {
      path: "/d/access-control/overView",
      name: "access-control-gem-overView",
      meta: { title: "总览中心", hideInMenu: true, activeMenuPath: "/d/access-control" },
      component: () => hostGemPage("OverView"),
    },
    {
      path: "/d/access-control/equipmentMonitorList",
      name: "access-control-gem-equipmentMonitorList",
      meta: { title: "门禁监测" },
      component: () =>
        hostGemPage("EquipmentMonitorList", {
          pageProps: { title: "门禁监测" },
        }),
    },
    // 旧拼写 entry，与正拼写同页
    {
      path: "/d/access-control/equipmentMoitorList",
      name: "access-control-gem-equipmentMoitorList",
      meta: { title: "门禁监测", hideInMenu: true, activeMenuPath: "/d/access-control/equipmentMonitorList" },
      component: () =>
        hostGemPage("EquipmentMonitorList", {
          pageProps: { title: "门禁监测" },
        }),
    },
    {
      path: "/d/access-control/equipmentMonitorDetail",
      name: "access-control-gem-equipmentMonitorDetail",
      meta: { title: "设备信息", hideInMenu: true, activeMenuPath: "/d/access-control/equipmentMonitorList" },
      component: () =>
        hostGemPage("EquipmentMonitorDetail", {
          idAs: "deviceId",
          pageProps: {
            title: "设备信息",
            applicationCode: "DOORMANAGE",
            scadaPageId: String(domainConfig.scadaPageId || ""),
            scadaViewerBase: String(domainConfig.scadaViewerBase || ""),
          },
        }),
    },
    {
      path: "/d/access-control/equipmentMoitorDetail",
      name: "access-control-gem-equipmentMoitorDetail",
      meta: { title: "设备信息", hideInMenu: true, activeMenuPath: "/d/access-control/equipmentMonitorList" },
      component: () =>
        hostGemPage("EquipmentMonitorDetail", {
          idAs: "deviceId",
          pageProps: {
            title: "设备信息",
            applicationCode: "DOORMANAGE",
            scadaPageId: String(domainConfig.scadaPageId || ""),
            scadaViewerBase: String(domainConfig.scadaViewerBase || ""),
          },
        }),
    },
    {
      path: "/d/access-control/alarmRecord",
      name: "access-control-gem-alarmRecord",
      meta: { title: "报警记录" },
      component: () => hostGemPage("AlarmRecord"),
    },
    {
      path: "/d/access-control/alarmDetail",
      name: "access-control-gem-alarmDetail",
      meta: { title: "报警详情", hideInMenu: true, activeMenuPath: "/d/access-control/alarmRecord" },
      component: () => hostGemPage("AlarmDetail", { idAs: "alarmId" }),
    },
    {
      path: "/d/access-control/alarmRecordSafety",
      name: "access-control-gem-alarmRecordSafety",
      meta: { title: "安全报警记录", hideInMenu: true, activeMenuPath: "/d/access-control/alarmRecord" },
      component: () => hostGemPage("AlarmRecordSafety"),
    },
    {
      path: "/d/access-control/alarmSafetyDetail",
      name: "access-control-gem-alarmSafetyDetail",
      meta: { title: "安全报警详情", hideInMenu: true, activeMenuPath: "/d/access-control/alarmRecord" },
      component: () => hostGemPage("AlarmSafetyDetail", { idAs: "alarmId" }),
    },
    {
      path: "/d/access-control/alarmConfigList",
      name: "access-control-gem-alarmConfigList",
      meta: { title: "报警配置" },
      component: () => hostGemPage("AlarmConfigList"),
    },
    {
      path: "/d/access-control/alarmConfigEnergyList",
      name: "access-control-gem-alarmConfigEnergyList",
      meta: { title: "能源报警配置", hideInMenu: true, activeMenuPath: "/d/access-control/alarmConfigList" },
      component: () => hostGemPage("AlarmConfigEnergyList"),
    },
    {
      path: "/d/access-control/alarmConfigureAdd",
      name: "access-control-gem-alarmConfigureAdd",
      meta: { title: "报警规则配置", hideInMenu: true, activeMenuPath: "/d/access-control/alarmConfigList" },
      component: () => hostGemPage("AlarmConfigureAdd", { idAs: "ruleId" }),
    },
    {
      path: "/d/access-control/alarmStatistic",
      name: "access-control-gem-alarmStatistic",
      meta: { title: "报警统计", hideInMenu: true, activeMenuPath: "/d/access-control/alarmRecord" },
      component: () =>
        hostGemPage("AlarmStatistic", {
          pageProps: { mode: "status", title: "报警统计" },
        }),
    },
    {
      path: "/d/access-control/alarm/record",
      name: "access-control-gem-alarmDrillRecord",
      meta: { title: "下钻报警记录", hideInMenu: true, activeMenuPath: "/d/access-control/alarmRecord" },
      component: () => hostGemPage("AlarmRecord"),
    },
    {
      path: "/d/access-control/alarmHandelStatistics",
      name: "access-control-gem-alarmHandelStatistics",
      meta: { title: "报警处理统计", hideInMenu: true, activeMenuPath: "/d/access-control/alarmRecord" },
      component: () =>
        hostGemPage("AlarmStatistic", {
          pageProps: { mode: "user", title: "报警处理统计" },
        }),
    },
    {
      path: "/d/access-control/alarmAnalysis",
      name: "access-control-gem-alarmAnalysis",
      meta: { title: "报警分析", hideInMenu: true, activeMenuPath: "/d/access-control/alarmRecord" },
      component: () =>
        hostGemPage("AlarmStatistic", {
          pageProps: { mode: "event", title: "报警分析" },
        }),
    },
    {
      path: "/d/access-control/applicationEquipment",
      name: "access-control-gem-applicationEquipment",
      meta: { title: "门禁设备" },
      component: () =>
        hostGemPage("ApplicationEquipment", {
          pageProps: { title: "门禁设备" },
        }),
    },
    {
      path: "/d/access-control/configuration",
      name: "access-control-gem-configuration",
      meta: { title: "二维组态图", hideInMenu: true, activeMenuPath: "/d/access-control/equipmentMonitorList" },
      component: () =>
        hostGemPage("Configuration", {
          pageProps: { configurationUrl: String(domainConfig.configurationUrl || "") },
        }),
    },
  ],
  menuContribution: [
    {
      label: "门禁管理",
      iconKey: "access-control",
      children: [
        { label: "门禁总览", path: "/d/access-control", entry: "" },
        {
          label: "门禁监测",
          functionCode: "GEM_EQUIPMENT_LIST",
          entry: "equipmentMonitorList",
          path: "/d/access-control/equipmentMonitorList",
        },
        {
          label: "门禁设备",
          functionCode: "GEM_ALARM_DEVICE",
          entry: "applicationEquipment",
          path: "/d/access-control/applicationEquipment",
        },
        { label: "通行记录", path: "/d/access-control/logs", entry: "logs" },
        { label: "异常事件", path: "/d/access-control/events", entry: "events" },
        {
          label: "门禁报警",
          children: [
            {
              label: "报警配置",
              functionCode: "GEM_ALARM_CONFIG",
              entry: "alarmConfigList",
              path: "/d/access-control/alarmConfigList",
            },
            {
              label: "报警记录",
              functionCode: "GEM_ALARM",
              entry: "alarmRecord",
              path: "/d/access-control/alarmRecord",
            },
          ],
        },
      ],
    },
  ],
  async install(app, ctx, config) {
    installCtx = ctx;
    installAccessControlContext(ctx);
    domainConfig = config ?? {};
    installAccessControlPcUi((await ctx.loadRuntimeCommon("pcUi", "index")) as typeof import("@g2-platform/pc-ui"));
    installAccessControlPcChart((await ctx.loadRuntimeCommon("pcChart", "index")) as typeof import("@g2-platform/pc-chart"));
    await ctx.loadPlatform("pcUi", "platform");
    await ctx.loadPlatform("pcChart", "platform");
    await ctx.loadPlatform("pcPlayer", "platform");
    await ctx.loadPlatform("pcScada", "platform");
    await ctx.loadPlatform("pcMap", "platform");
    await ctx.loadPlatform("pcIotSocket", "platform");
    await ctx.loadPlatform("pcAlarmCharts", "platform");
    await ctx.loadPlatform("pcGraphEditor", "platform");
    await ctx.loadPlatform("pcVisualSdk", "platform");
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
    const applicationCode = typeof config?.applicationCode === "string" ? config.applicationCode : "DOORMANAGE";
    app.provide(APPLICATION_CODE_KEY, applicationCode);
  },
};

export default domainModule;
