import type { AlarmCenterClient } from "@g2-client/alarm-center/client";
import type { DeviceCenterClient } from "@g2-client/device-center/client";
import type { DictionaryClient } from "@g2-client/dictionary/client";
import type { FileClient } from "@g2-client/file/client";
import type { OuaaClient } from "@g2-client/ouaa/client";
import type { DomainContext, DomainModule } from "@g2-composition/contract";
import type { GemMessageConfigClient } from "@g2-pages/generic-equipment-monitor";
import { type Component, defineComponent, h } from "vue";

import { APPLICATION_CODE_KEY, DOMAIN_CONTEXT_KEY, installSecurityMonitorContext, installSecurityMonitorPcChart } from "./domain-context";
import type { GemMountOptions } from "./mount-gem-page";
import { securityMonitorRouteFor } from "./ouaa-route-map";
import { loadSecurityPcUi } from "./views/pc-ui-runtime";

let installContext: DomainContext | null = null;
let domainConfig: Record<string, unknown> = {};
const GEM_PAGE_LIBRARY = "genericEquipmentMonitorPages";
const GEM_CONTRACT_MAJOR = 1;

function pageLibraryErrorPage(error: unknown): Component {
  const message = error instanceof Error ? error.message : String(error);
  return defineComponent({
    name: "SecurityMonitorPageLibraryLoadError",
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

function requireContext(): DomainContext {
  if (!installContext) {
    throw new Error("security-monitor domain not installed");
  }
  return installContext;
}

const getAlarmClient = (): Promise<AlarmCenterClient> => requireContext().ensureClient<AlarmCenterClient>("alarmCenterClient");
const getDeviceClient = (): Promise<DeviceCenterClient> => requireContext().ensureClient<DeviceCenterClient>("deviceCenterClient");
const getOuaaClient = (): Promise<OuaaClient> => requireContext().ensureClient<OuaaClient>("ouaaClient");
const getFileClient = (): Promise<FileClient> => requireContext().ensureClient<FileClient>("fileClient");
const getDictionaryClient = (): Promise<DictionaryClient> => requireContext().ensureClient<DictionaryClient>("dictionaryClient");
const getMessageConfigClient = (): Promise<GemMessageConfigClient> =>
  requireContext().ensureClient<GemMessageConfigClient>("emergencyManagementClient");

function resolveApplicationCode(): string {
  return typeof domainConfig.applicationCode === "string" && domainConfig.applicationCode
    ? domainConfig.applicationCode
    : "SECURITY_MONITORING";
}

async function hostGemPage(
  exposedPath: string,
  options?: Omit<
    GemMountOptions,
    "getAlarmClient" | "getDeviceClient" | "getOuaaClient" | "getFileClient" | "getDictionaryClient" | "getMessageConfigClient"
  >,
): Promise<Component> {
  try {
    const [loaded, contractModule, { mountGemPage }] = await Promise.all([
      requireContext().loadPageLibrary<{ default?: Component }>(GEM_PAGE_LIBRARY, exposedPath),
      requireContext().loadPageLibrary<{ contractInfo?: { name?: string; major?: number } }>(GEM_PAGE_LIBRARY, "contractInfo"),
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
      getMessageConfigClient,
      getFunctionCodes: () => requireContext().getFunctionCodes(),
      pageProps: { applicationCode: resolveApplicationCode(), ...options?.pageProps },
    });
  } catch (error) {
    return pageLibraryErrorPage(error);
  }
}

const domainModule: DomainModule = {
  routes: [
    {
      path: "/d/security-monitor",
      name: "security-monitor-home",
      meta: { title: "安防监控" },
      component: () => import("./views/security-overview"),
    },
    {
      path: "/d/security-monitor/ai-inspection/plans",
      name: "security-monitor-ai-inspection-plans",
      meta: { title: "巡检计划", permissionCode: "aiInspection:plan:view" },
      component: () => import("./views/ai-inspection-pages").then((module) => module.AiInspectionPlanListPage),
    },
    {
      path: "/d/security-monitor/ai-inspection/plans/create",
      name: "security-monitor-ai-inspection-plan-create",
      meta: {
        title: "新增巡检计划",
        permissionCode: "aiInspection:plan:create",
        hideInMenu: true,
        activeMenuPath: "/d/security-monitor/ai-inspection/plans",
      },
      component: () => import("./views/ai-inspection-pages").then((module) => module.AiInspectionPlanEditorPage),
    },
    {
      path: "/d/security-monitor/ai-inspection/plans/:id/edit",
      name: "security-monitor-ai-inspection-plan-edit",
      meta: {
        title: "编辑巡检计划",
        permissionCode: "aiInspection:plan:update",
        hideInMenu: true,
        activeMenuPath: "/d/security-monitor/ai-inspection/plans",
      },
      component: () => import("./views/ai-inspection-pages").then((module) => module.AiInspectionPlanEditorPage),
    },
    {
      path: "/d/security-monitor/ai-inspection/tasks",
      name: "security-monitor-ai-inspection-tasks",
      meta: { title: "巡检任务", permissionCode: "aiInspection:task:view" },
      component: () => import("./views/ai-inspection-pages").then((module) => module.AiInspectionTaskListPage),
    },
    {
      path: "/d/security-monitor/ai-inspection/tasks/:id",
      name: "security-monitor-ai-inspection-task-detail",
      meta: {
        title: "巡检任务详情",
        permissionCode: "aiInspection:task:view",
        hideInMenu: true,
        activeMenuPath: "/d/security-monitor/ai-inspection/tasks",
      },
      component: () => import("./views/ai-inspection-pages").then((module) => module.AiInspectionTaskDetailPage),
    },
    {
      path: "/d/security-monitor/ai-inspection/events",
      name: "security-monitor-ai-inspection-events",
      meta: {
        title: "异常事件",
        permissionCode: "aiInspection:event:view",
        hideInMenu: true,
        activeMenuPath: "/d/security-monitor/ai-inspection/tasks",
      },
      component: () => import("./views/ai-inspection-pages").then((module) => module.AiInspectionEventListPage),
    },
    {
      path: "/d/security-monitor/permissions",
      name: "security-monitor-permissions",
      meta: { title: "监控权限列表" },
      component: () => import("./views/video-monitor-permissions").then((module) => module.VideoMonitorPermissionListPage),
    },
    {
      path: "/d/security-monitor/permissions/new",
      name: "security-monitor-permission-create",
      meta: { title: "新增监控权限", hideInMenu: true, activeMenuPath: "/d/security-monitor/permissions" },
      component: () => import("./views/video-monitor-permissions").then((module) => module.VideoMonitorPermissionEditorPage),
    },
    {
      path: "/d/security-monitor/permissions/:id/edit",
      name: "security-monitor-permission-edit",
      meta: { title: "编辑监控权限", hideInMenu: true, activeMenuPath: "/d/security-monitor/permissions" },
      component: () => import("./views/video-monitor-permissions").then((module) => module.VideoMonitorPermissionEditorPage),
    },
    {
      path: "/d/security-monitor/permissions/:id/detail",
      name: "security-monitor-permission-detail",
      meta: { title: "监控权限详情", hideInMenu: true, activeMenuPath: "/d/security-monitor/permissions" },
      component: () => import("./views/video-monitor-permissions").then((module) => module.VideoMonitorPermissionEditorPage),
    },
    {
      path: "/d/security-monitor/alarmPage",
      name: "security-monitor-alarm-page",
      meta: { title: "报警记录", hideInMenu: true, activeMenuPath: "/d/security-monitor/alarmRecord" },
      component: () => hostGemPage("AlarmRecord", { pageProps: { title: "报警记录" } }),
    },
    {
      path: "/d/security-monitor/alarmRecord",
      name: "security-monitor-alarm-record",
      meta: { title: "报警记录" },
      component: () => hostGemPage("AlarmRecord", { pageProps: { title: "报警记录" } }),
    },
    {
      path: "/d/security-monitor/alarmDetail",
      name: "security-monitor-alarm-detail",
      meta: { title: "报警详情", hideInMenu: true, activeMenuPath: "/d/security-monitor/alarmRecord" },
      component: () => hostGemPage("AlarmDetail", { idAs: "alarmId" }),
    },
    {
      path: "/d/security-monitor/multipleVideo",
      name: "security-monitor-multiple-video",
      meta: { title: "多路视频" },
      component: () => import("./views/multiple-video"),
    },
    {
      path: "/d/security-monitor/patrolLine",
      name: "security-monitor-patrol-line",
      meta: { title: "巡逻线路" },
      component: () => import("./views/patrol-pages").then((module) => module.PatrolLinePage),
    },
    {
      path: "/d/security-monitor/addLine",
      name: "security-monitor-add-line",
      meta: { title: "新增巡逻路线", hideInMenu: true, activeMenuPath: "/d/security-monitor/patrolLine" },
      component: () => import("./views/patrol-pages").then((module) => module.PatrolLineEditorPage),
    },
    {
      path: "/d/security-monitor/patrolLineDetail",
      name: "security-monitor-patrol-line-detail",
      meta: { title: "巡逻路线详情", hideInMenu: true, activeMenuPath: "/d/security-monitor/patrolLine" },
      component: () => import("./views/patrol-pages").then((module) => module.PatrolLineDetailPage),
    },
    {
      path: "/d/security-monitor/patrolRecord",
      name: "security-monitor-patrol-record",
      meta: { title: "巡逻记录" },
      component: () => import("./views/patrol-pages").then((module) => module.PatrolRecordPage),
    },
    {
      path: "/d/security-monitor/recordDetail",
      name: "security-monitor-record-detail",
      meta: { title: "巡逻记录详情", hideInMenu: true, activeMenuPath: "/d/security-monitor/patrolRecord" },
      component: () => import("./views/patrol-pages").then((module) => module.PatrolRecordDetailPage),
    },
    {
      path: "/d/security-monitor/implementPatro",
      name: "security-monitor-implement-patrol",
      meta: { title: "视频巡逻", hideInMenu: true, activeMenuPath: "/d/security-monitor/patrolLine" },
      component: () => import("./views/patrol-pages").then((module) => module.PatrolExecutionPage),
    },
    {
      path: "/d/security-monitor/overView",
      name: "security-monitor-overview",
      meta: { title: "数据总览" },
      component: () => import("./views/security-overview"),
    },
    {
      path: "/d/security-monitor/monitoring",
      name: "security-monitor-monitoring",
      meta: { title: "监控权限", hideInMenu: true, activeMenuPath: "/d/security-monitor/permissions" },
      component: () => import("./views/video-monitor-permissions").then((module) => module.VideoMonitorPermissionListPage),
    },
    {
      path: "/d/security-monitor/monitoringNew",
      name: "security-monitor-monitoring-new",
      meta: { title: "监控权限", hideInMenu: true, activeMenuPath: "/d/security-monitor/permissions" },
      component: () => import("./views/video-monitor-permissions").then((module) => module.VideoMonitorPermissionEditorPage),
    },
    {
      path: "/d/security-monitor/alarmStatistics",
      name: "security-monitor-alarm-statistics",
      meta: { title: "报警统计" },
      component: () => import("./views/alarm-statistics-pages").then((module) => module.AlarmStatisticsPage),
    },
    {
      path: "/d/security-monitor/alarmHandelStatistics",
      name: "security-monitor-alarm-handel-statistics",
      meta: { title: "报警处理统计" },
      component: () => import("./views/alarm-statistics-pages").then((module) => module.AlarmHandlerStatisticsPage),
    },
    {
      path: "/d/security-monitor/alarm/record",
      name: "security-monitor-alarm-drill-record",
      meta: { title: "报警记录", hideInMenu: true, activeMenuPath: "/d/security-monitor/alarmStatistics" },
      component: () =>
        hostGemPage("AlarmRecord", {
          pageProps: { title: "报警记录" },
          routeQueryAs: "initialQuery",
        }),
    },
    {
      path: "/d/security-monitor/patrolStatistics",
      name: "security-monitor-patrol-statistics",
      meta: { title: "巡逻统计" },
      component: () => import("./views/patrol-pages").then((module) => module.PatrolStatisticsPage),
    },
    {
      path: "/d/security-monitor/patrol/record",
      name: "security-monitor-patrol-route-record",
      meta: { title: "巡逻路线记录", hideInMenu: true, activeMenuPath: "/d/security-monitor/patrolStatistics" },
      component: () => import("./views/patrol-pages").then((module) => module.PatrolRouteRecordPage),
    },
    {
      path: "/d/security-monitor/safetyAnalysis",
      name: "security-monitor-safety-analysis",
      meta: { title: "安全分析" },
      component: () => import("./views/alarm-statistics-pages").then((module) => module.SafetyAnalysisPage),
    },
    {
      path: "/d/security-monitor/alarmRulesList",
      name: "security-monitor-alarm-rules-list",
      meta: { title: "报警配置" },
      component: () => hostGemPage("AlarmConfigList", { pageProps: { title: "报警配置" } }),
    },
    {
      path: "/d/security-monitor/alarmRulesConfig",
      name: "security-monitor-alarm-rules-config",
      meta: { title: "报警规则配置", hideInMenu: true, activeMenuPath: "/d/security-monitor/alarmRulesList" },
      component: () =>
        hostGemPage("AlarmConfigureAdd", {
          idAs: "ruleId",
          pageProps: { title: "报警规则配置" },
        }),
    },
    {
      path: "/d/security-monitor/applicationEquipment",
      name: "security-monitor-application-equipment",
      meta: { title: "监控设备", hideInMenu: true, activeMenuPath: "/d/security-monitor/equipment-association" },
      component: () => hostGemPage("ApplicationEquipment", { pageProps: { title: "监控设备" } }),
    },
    {
      path: "/d/security-monitor/message-notice",
      name: "security-monitor-message-notice",
      meta: { title: "消息配置" },
      component: () => hostGemPage("MessageNotice", { pageProps: { title: "消息配置" } }),
    },
    {
      path: "/d/security-monitor/equipment-association",
      name: "security-monitor-equipment-association",
      meta: { title: "设备关联" },
      component: () => hostGemPage("EquipmentAssociation", { pageProps: { title: "设备关联" } }),
    },
  ],
  menuContribution: [
    {
      label: "安防监控",
      iconKey: "security-monitor",
      children: [
        {
          label: "AI视频巡检",
          children: [
            {
              label: "AI-巡检计划",
              entry: "ai-inspection/plans",
              path: securityMonitorRouteFor("/portal/video-monitor-auth/ai-inspection/plans"),
            },
            {
              label: "AI-巡检任务",
              entry: "ai-inspection/tasks",
              path: securityMonitorRouteFor("/portal/video-monitor-auth/ai-inspection/tasks"),
            },
          ],
        },
        {
          label: "数据总览",
          entry: "overView",
          path: securityMonitorRouteFor("/portal/securityMonitoring/overView"),
        },
        {
          label: "监控权限",
          entry: "permissions",
          path: securityMonitorRouteFor("/portal/video-monitor-auth/permissions"),
        },
        {
          label: "视频监控",
          children: [
            {
              label: "实时监控",
              entry: "multipleVideo",
              path: securityMonitorRouteFor("/portal/securityMonitoring/multipleVideo"),
            },
            {
              label: "巡逻路线",
              entry: "patrolLine",
              path: securityMonitorRouteFor("/portal/securityMonitoring/patrolLine"),
            },
            {
              label: "巡逻记录",
              entry: "patrolRecord",
              path: securityMonitorRouteFor("/portal/securityMonitoring/patrolRecord"),
            },
          ],
        },
        {
          label: "报警中心",
          children: [
            {
              label: "报警记录",
              entry: "alarmRecord",
              path: securityMonitorRouteFor("/portal/genericEquipmentMonitor/alarmRecord"),
            },
            {
              label: "报警配置",
              entry: "alarmRulesList",
              path: securityMonitorRouteFor("/portal/securityMonitoring/alarmRulesList"),
            },
          ],
        },
        {
          label: "统计分析",
          children: [
            {
              label: "报警统计",
              entry: "alarmStatistics",
              path: securityMonitorRouteFor("/portal/securityMonitoring/alarmStatistics"),
            },
            {
              label: "报警处理统计",
              entry: "alarmHandelStatistics",
              path: securityMonitorRouteFor("/portal/securityMonitoring/alarmHandelStatistics"),
            },
            {
              label: "巡逻路线统计",
              entry: "patrolStatistics",
              path: securityMonitorRouteFor("/portal/securityMonitoring/patrolStatistics"),
            },
            {
              label: "安全分析",
              entry: "safetyAnalysis",
              path: securityMonitorRouteFor("/portal/securityMonitoring/safetyAnalysis"),
            },
          ],
        },
        {
          label: "消息配置",
          entry: "newMessageNotice",
          path: securityMonitorRouteFor("/portal/legacy-business-config/newMessageNotice"),
        },
        {
          label: "设备关联",
          entry: "equipment-association",
          path: securityMonitorRouteFor("/portal/generic-equipment/equipment-association"),
        },
      ],
    },
  ],
  async install(app, ctx, config) {
    installContext = ctx;
    domainConfig = config ?? {};
    installSecurityMonitorContext(ctx);
    await loadSecurityPcUi();
    await ctx.loadPlatform("pcUi", "platform");
    installSecurityMonitorPcChart((await ctx.loadRuntimeCommon("pcChart", "index")) as typeof import("@g2-platform/pc-chart"));
    await ctx.loadPlatform("pcChart", "platform");
    await ctx.loadPlatform("pcPlayer", "platform");
    await ctx.loadPlatform("pcScada", "platform");
    await ctx.loadPlatform("pcMap", "platform");
    await ctx.loadPlatform("pcIotSocket", "platform");
    await ctx.loadPlatform("pcAlarmCharts", "platform");
    await ctx.loadPlatform("pcGraphEditor", "platform");
    await ctx.loadPlatform("pcVisualSdk", "platform");
    await ctx.ensureClient("securityMonitorClient");
    await ctx.ensureClient("videoMonitorClient");
    app.provide(DOMAIN_CONTEXT_KEY, ctx);
    app.provide(APPLICATION_CODE_KEY, typeof config?.applicationCode === "string" ? config.applicationCode : "SECURITY_MONITORING");
  },
};

export default domainModule;
